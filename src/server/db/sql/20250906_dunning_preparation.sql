-- Migration: Pre-S9 Dunning Data Model
-- Adds required fields and tables for reminder/dunning system

-- Add dunning opt-out to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS opt_out_dunning boolean DEFAULT false;

-- Add reminder tracking fields to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
ADD COLUMN IF NOT EXISTS next_reminder_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;

-- Create dunning_events table for audit trail and compliance
CREATE TABLE IF NOT EXISTS dunning_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Event details
    event_type text NOT NULL CHECK (event_type IN (
        'reminder_sent', 'payment_received', 'opted_out', 'manual_follow_up'
    )),
    channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'manual')),
    
    -- Metadata (no PII stored)
    template_used text,
    delivery_status text, -- 'sent', 'delivered', 'failed', 'read'
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    delivered_at timestamptz
    
    -- Note: Tenant isolation enforced by foreign key constraints and RLS policies
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dunning_events_invoice_id ON dunning_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_events_org_id ON dunning_events(org_id);
CREATE INDEX IF NOT EXISTS idx_dunning_events_created_at ON dunning_events(created_at DESC);

-- Add index for reminder queries
CREATE INDEX IF NOT EXISTS idx_invoices_reminder_due ON invoices(next_reminder_at) 
WHERE next_reminder_at IS NOT NULL AND paid_at IS NULL;

-- Add index for overdue calculations  
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices(due_at, paid_at) 
WHERE due_at IS NOT NULL AND paid_at IS NULL;

-- Enable RLS on dunning_events table
ALTER TABLE dunning_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access dunning events for their organization
CREATE POLICY dunning_events_org_policy ON dunning_events
    FOR ALL USING (org_id = current_org_id());

-- Helper function: Calculate days overdue for an invoice
CREATE OR REPLACE FUNCTION days_overdue(invoice_due_at timestamptz)
RETURNS integer
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN invoice_due_at IS NULL THEN 0
        WHEN invoice_due_at > now() THEN 0
        ELSE EXTRACT(days FROM (now() - invoice_due_at))::integer
    END;
$$;

-- Helper function: Calculate due date from issued_at and payment_terms
CREATE OR REPLACE FUNCTION calculate_due_date(
    issued_at timestamptz, 
    payment_terms text DEFAULT '30 days'
)
RETURNS timestamptz
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN payment_terms = '14 days' THEN issued_at + interval '14 days'
        WHEN payment_terms = '21 days' THEN issued_at + interval '21 days' 
        WHEN payment_terms = '60 days' THEN issued_at + interval '60 days'
        WHEN payment_terms = '90 days' THEN issued_at + interval '90 days'
        ELSE issued_at + interval '30 days' -- Default 30 days
    END;
$$;

-- Update existing invoices to have consistent due_at if missing
UPDATE invoices 
SET due_at = calculate_due_date(issued_at::timestamptz, payment_terms)
WHERE due_at IS NULL 
    AND issued_at IS NOT NULL;

-- Create view for overdue invoices (useful for dunning queries)
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT 
    i.*,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    c.opt_out_dunning,
    days_overdue(i.due_at) as days_overdue,
    CASE 
        WHEN days_overdue(i.due_at) >= 60 THEN 'severe'
        WHEN days_overdue(i.due_at) >= 30 THEN 'moderate' 
        WHEN days_overdue(i.due_at) >= 7 THEN 'mild'
        ELSE 'current'
    END as overdue_severity
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.paid_at IS NULL 
    AND i.due_at IS NOT NULL 
    AND i.due_at < now()
    AND c.opt_out_dunning = false;

-- Note: View inherits RLS from underlying tables

COMMENT ON TABLE dunning_events IS 'Audit trail for all dunning/reminder activities with GDPR compliance';
COMMENT ON COLUMN customers.opt_out_dunning IS 'Customer opt-out flag for payment reminders (GDPR compliance)';
COMMENT ON COLUMN invoices.last_reminder_at IS 'Timestamp of last reminder sent to customer';
COMMENT ON COLUMN invoices.next_reminder_at IS 'Scheduled time for next reminder (NULL if no reminder needed)';
COMMENT ON COLUMN invoices.reminder_count IS 'Number of reminders sent for this invoice';
COMMENT ON FUNCTION days_overdue IS 'Calculate number of days an invoice is overdue (0 if not overdue)';
COMMENT ON FUNCTION calculate_due_date IS 'Calculate due date based on issued date and payment terms';
COMMENT ON VIEW overdue_invoices IS 'All unpaid invoices past due date with customer contact info (respects opt-out)';