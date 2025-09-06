-- Migration: Invoice Drafts and Voice Mode Support
-- Purpose: Add invoice draft management with Voice Mode confirmation support
-- Applied: TBD
-- Date: January 2025
-- Phase: Invoice System (Phase 4.2)

-- =============================================================================
-- Invoice Drafts Table
-- =============================================================================

-- Invoice drafts for Safe/Fast mode workflow before finalization
CREATE TABLE IF NOT EXISTS invoice_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    
    -- Line items stored as JSONB for flexibility
    lines JSONB NOT NULL DEFAULT '[]',
    
    -- Calculated totals (denormalized for performance)
    subtotal_ex_vat NUMERIC(10,2) NOT NULL DEFAULT 0,
    vat_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_inc_vat NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Payment settings
    payment_terms TEXT NOT NULL DEFAULT '30_days' 
        CHECK (payment_terms IN ('14_days', '30_days', 'immediate', 'on_completion')),
    
    -- Additional information
    notes TEXT,
    
    -- Voice Mode confirmation status
    is_confirmed BOOLEAN NOT NULL DEFAULT false,
    voice_confirmed_at TIMESTAMPTZ,
    voice_review_requested BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one draft per job
    UNIQUE(job_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_org_id ON invoice_drafts(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_job_id ON invoice_drafts(job_id);
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_customer_id ON invoice_drafts(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_created_at ON invoice_drafts(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_is_confirmed ON invoice_drafts(is_confirmed);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_invoice_drafts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_invoice_drafts_timestamp
    BEFORE UPDATE ON invoice_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_drafts_timestamp();

-- =============================================================================
-- Invoice Number Generation Function
-- =============================================================================

-- Atomic invoice number generation with organization-specific prefixes
CREATE OR REPLACE FUNCTION increment_invoice_number(org_id_param TEXT)
RETURNS TABLE(
    next_invoice_number INTEGER,
    invoice_prefix TEXT
) AS $$
DECLARE
    current_number INTEGER;
    prefix TEXT;
BEGIN
    -- Get current settings and increment atomically
    UPDATE org_settings 
    SET next_invoice_number = COALESCE(next_invoice_number, 1) + 1
    WHERE org_id = org_id_param
    RETURNING org_settings.next_invoice_number - 1, org_settings.invoice_prefix
    INTO current_number, prefix;
    
    -- If no settings exist, create default
    IF NOT FOUND THEN
        INSERT INTO org_settings (org_id, next_invoice_number, invoice_prefix)
        VALUES (org_id_param, 2, 'FACT')
        ON CONFLICT (org_id) DO UPDATE 
        SET next_invoice_number = org_settings.next_invoice_number + 1
        RETURNING org_settings.next_invoice_number - 1, org_settings.invoice_prefix
        INTO current_number, prefix;
    END IF;
    
    -- Return the number that was just reserved
    RETURN QUERY SELECT current_number, COALESCE(prefix, 'FACT');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Voice Notes Extension for Invoice Context
-- =============================================================================

-- Extend voice_notes to support invoice draft context
ALTER TABLE voice_notes 
ADD COLUMN IF NOT EXISTS invoice_draft_id UUID REFERENCES invoice_drafts(id) ON DELETE SET NULL;

-- Index for invoice draft voice notes
CREATE INDEX IF NOT EXISTS idx_voice_notes_invoice_draft_id ON voice_notes(invoice_draft_id);

-- =============================================================================
-- Enhanced Audit Logging for Invoice Actions
-- =============================================================================

-- Function to log invoice draft changes
CREATE OR REPLACE FUNCTION log_invoice_draft_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Log invoice draft creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (org_id, action, resource, payload_json)
        VALUES (NEW.org_id, 'create', 'invoice_draft', 
                json_build_object(
                    'draft_id', NEW.id,
                    'job_id', NEW.job_id,
                    'total_inc_vat', NEW.total_inc_vat
                ));
        RETURN NEW;
    END IF;
    
    -- Log invoice draft updates
    IF TG_OP = 'UPDATE' THEN
        -- Only log significant changes
        IF OLD.is_confirmed != NEW.is_confirmed OR 
           OLD.total_inc_vat != NEW.total_inc_vat OR
           OLD.lines != NEW.lines THEN
            INSERT INTO audit_logs (org_id, action, resource, payload_json)
            VALUES (NEW.org_id, 'update', 'invoice_draft',
                    json_build_object(
                        'draft_id', NEW.id,
                        'job_id', NEW.job_id,
                        'changes', json_build_object(
                            'confirmed', CASE WHEN OLD.is_confirmed != NEW.is_confirmed 
                                             THEN json_build_object('from', OLD.is_confirmed, 'to', NEW.is_confirmed)
                                             ELSE NULL END,
                            'total_changed', OLD.total_inc_vat != NEW.total_inc_vat,
                            'lines_changed', OLD.lines != NEW.lines,
                            'voice_confirmed', NEW.voice_confirmed_at IS NOT NULL AND OLD.voice_confirmed_at IS NULL
                        )
                    ));
        END IF;
        RETURN NEW;
    END IF;
    
    -- Log invoice draft deletion
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (org_id, action, resource, payload_json)
        VALUES (OLD.org_id, 'delete', 'invoice_draft',
                json_build_object(
                    'draft_id', OLD.id,
                    'job_id', OLD.job_id,
                    'was_confirmed', OLD.is_confirmed
                ));
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger for invoice drafts
CREATE OR REPLACE TRIGGER trigger_audit_invoice_drafts
    AFTER INSERT OR UPDATE OR DELETE ON invoice_drafts
    FOR EACH ROW
    EXECUTE FUNCTION log_invoice_draft_audit();

-- =============================================================================
-- Sample Line Items Structure (Documentation)
-- =============================================================================

-- JSONB structure for invoice_drafts.lines:
/*
[
    {
        "id": "uuid",
        "lineType": "labor" | "material",
        "description": "Werkzaamheden - Lekkage reparatie",
        "qty": 1.5,
        "unitPriceExVat": 85.00,
        "vatRate": 21,
        "lineTotalExVat": 127.50,
        "vatAmount": 26.78,
        "lineTotalIncVat": 154.28,
        "voiceConfirmed": true
    }
]
*/

-- =============================================================================
-- Performance Optimizations
-- =============================================================================

-- JSONB operator class for better performance on lines column
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_lines_gin ON invoice_drafts USING GIN (lines);

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_unconfirmed 
    ON invoice_drafts(org_id, created_at) 
    WHERE is_confirmed = false;

CREATE INDEX IF NOT EXISTS idx_invoice_drafts_voice_review 
    ON invoice_drafts(org_id, updated_at) 
    WHERE voice_review_requested = true;

-- =============================================================================
-- Data Validation Functions
-- =============================================================================

-- Validate invoice draft lines structure
CREATE OR REPLACE FUNCTION validate_invoice_draft_lines(lines_json JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    line JSONB;
BEGIN
    -- Check if lines is an array
    IF jsonb_typeof(lines_json) != 'array' THEN
        RETURN false;
    END IF;
    
    -- Validate each line item
    FOR line IN SELECT * FROM jsonb_array_elements(lines_json)
    LOOP
        -- Required fields
        IF NOT (line ? 'id' AND line ? 'lineType' AND line ? 'description' AND 
                line ? 'qty' AND line ? 'unitPriceExVat' AND line ? 'vatRate') THEN
            RETURN false;
        END IF;
        
        -- Validate line type
        IF line->>'lineType' NOT IN ('labor', 'material') THEN
            RETURN false;
        END IF;
        
        -- Validate VAT rate
        IF (line->>'vatRate')::INTEGER NOT IN (0, 9, 21) THEN
            RETURN false;
        END IF;
        
        -- Validate numeric fields are positive
        IF (line->>'qty')::NUMERIC <= 0 OR (line->>'unitPriceExVat')::NUMERIC < 0 THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate lines structure
ALTER TABLE invoice_drafts 
ADD CONSTRAINT check_valid_lines 
CHECK (validate_invoice_draft_lines(lines));