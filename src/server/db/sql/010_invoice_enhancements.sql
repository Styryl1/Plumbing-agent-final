-- 010_invoice_enhancements.sql
-- Enhances existing invoice system with integer cents, payments, and specialized audit
-- Builds upon existing tables rather than replacing them

-- ============================================================================
-- Add missing columns to existing invoices table
-- ============================================================================

-- Add integer cent columns alongside existing NUMERIC (for migration period)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER,
ADD COLUMN IF NOT EXISTS vat_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS total_cents INTEGER,
ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN IF NOT EXISTS number_int INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')
),
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '30_days' CHECK (
    payment_terms IN ('immediate', '14_days', '30_days', '60_days', 'on_completion')
),
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (
    payment_method IN ('ideal', 'banktransfer', 'cash', 'card', 'manual')
),
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pdf_hash TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint for integer invoice numbers
ALTER TABLE invoices 
ADD CONSTRAINT unique_invoice_number_per_org_year 
UNIQUE (org_id, year, number_int);

-- ============================================================================
-- Enhance invoice_lines table with cents
-- ============================================================================

ALTER TABLE invoice_lines
ADD COLUMN IF NOT EXISTS line_number INTEGER,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'stuks',
ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS line_total_ex_vat_cents INTEGER,
ADD COLUMN IF NOT EXISTS vat_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS line_total_inc_vat_cents INTEGER,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add line type options
ALTER TABLE invoice_lines 
DROP CONSTRAINT IF EXISTS invoice_lines_line_type_check;

ALTER TABLE invoice_lines
ADD CONSTRAINT invoice_lines_line_type_check 
CHECK (line_type IN ('labor', 'material', 'travel', 'discount', 'deposit'));

-- ============================================================================
-- Payment Tracking Table (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Payment details
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    payment_method TEXT NOT NULL CHECK (
        payment_method IN ('ideal', 'banktransfer', 'cash', 'card', 'manual')
    ),
    
    -- Provider information (Mollie)
    provider TEXT CHECK (provider IN ('mollie', 'manual')),
    provider_payment_id TEXT,
    provider_checkout_url TEXT,
    provider_status TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')
    ),
    
    -- Idempotency
    idempotency_key TEXT UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Metadata from provider
    provider_metadata JSONB DEFAULT '{}'::JSONB
);

-- ============================================================================
-- Specialized Invoice Audit Log (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Resource tracking
    resource_type TEXT NOT NULL CHECK (
        resource_type IN ('invoice', 'payment', 'reminder', 'credit_note')
    ),
    resource_id UUID NOT NULL,
    
    -- Action performed
    action TEXT NOT NULL CHECK (
        action IN ('created', 'updated', 'sent', 'reminded', 'paid', 'cancelled', 'refunded', 'voided', 'credited')
    ),
    
    -- Actor information
    actor_id TEXT NOT NULL, -- User ID from Clerk
    actor_role TEXT, -- Role at time of action
    
    -- Change details (no PII)
    changes JSONB DEFAULT '{}'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Invoice Number Sequences (NEW - better than org_settings approach)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_number_sequences (
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (org_id, year)
);

-- ============================================================================
-- Migration functions to convert NUMERIC to cents
-- ============================================================================

-- Function to migrate existing invoice amounts to cents
CREATE OR REPLACE FUNCTION migrate_invoice_to_cents()
RETURNS void AS $$
BEGIN
    UPDATE invoices 
    SET 
        subtotal_cents = COALESCE((subtotal_ex_vat * 100)::INTEGER, 0),
        vat_amount_cents = COALESCE((vat_total * 100)::INTEGER, 0),
        total_cents = COALESCE((total_inc_vat * 100)::INTEGER, 0)
    WHERE subtotal_cents IS NULL;
    
    UPDATE invoice_lines
    SET
        unit_price_cents = COALESCE((unit_price_ex_vat * 100)::INTEGER, 0),
        line_total_ex_vat_cents = COALESCE((line_total_ex_vat * 100)::INTEGER, 0),
        vat_amount_cents = COALESCE((vat_amount * 100)::INTEGER, 0),
        line_total_inc_vat_cents = COALESCE((line_total_inc_vat * 100)::INTEGER, 0)
    WHERE unit_price_cents IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_invoice_to_cents();

-- ============================================================================
-- Enhanced atomic invoice number function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_invoice_number(p_org_id TEXT, p_year INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_year INTEGER;
    v_next_number INTEGER;
BEGIN
    -- Use current year if not specified
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    
    -- Get and increment the number atomically
    INSERT INTO invoice_number_sequences (org_id, year, next_number)
    VALUES (p_org_id, v_year, 2)
    ON CONFLICT (org_id, year)
    DO UPDATE SET 
        next_number = invoice_number_sequences.next_number + 1,
        last_updated = NOW()
    RETURNING next_number - 1 INTO v_next_number;
    
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_org_id ON invoice_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_provider_payment_id ON invoice_payments(provider_payment_id) WHERE provider_payment_id IS NOT NULL;

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_org_id ON invoice_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_resource ON invoice_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_created_at ON invoice_audit_log(created_at);

-- Invoice enhancement indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_year ON invoices(year);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON invoices(sent_at);

-- ============================================================================
-- RLS Policies for new tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_number_sequences ENABLE ROW LEVEL SECURITY;

-- Payments: org members can view, owner/admin can modify
CREATE POLICY invoice_payments_select ON invoice_payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.org_id = invoice_payments.org_id
        AND e.user_id = auth.jwt()->>'sub'
    )
);

CREATE POLICY invoice_payments_insert ON invoice_payments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.org_id = invoice_payments.org_id
        AND e.user_id = auth.jwt()->>'sub'
        AND e.role IN ('owner', 'admin')
    )
);

CREATE POLICY invoice_payments_update ON invoice_payments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.org_id = invoice_payments.org_id
        AND e.user_id = auth.jwt()->>'sub'
        AND e.role IN ('owner', 'admin')
    )
);

-- Audit log: org members can view, system inserts only via functions
CREATE POLICY invoice_audit_log_select ON invoice_audit_log FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.org_id = invoice_audit_log.org_id
        AND e.user_id = auth.jwt()->>'sub'
    )
);

-- Number sequences: system access only via function
CREATE POLICY invoice_number_sequences_select ON invoice_number_sequences FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.org_id = invoice_number_sequences.org_id
        AND e.user_id = auth.jwt()->>'sub'
        AND e.role IN ('owner', 'admin')
    )
);

-- ============================================================================
-- Update Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_lines_updated_at 
    BEFORE UPDATE ON invoice_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();