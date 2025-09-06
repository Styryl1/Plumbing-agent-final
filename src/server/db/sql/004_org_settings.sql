-- Migration: Organization Settings Table
-- Purpose: Add per-organization settings including invoice confirmation preferences
-- Applied: TBD
-- Date: January 2025
-- Phase: Invoice System (Phase 4.1)

-- =============================================================================
-- Organization Settings
-- =============================================================================

-- Organization-level settings and preferences
CREATE TABLE IF NOT EXISTS org_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Invoice settings
    fast_confirm_invoices BOOLEAN NOT NULL DEFAULT false, -- Safe mode vs Fast mode
    default_payment_terms TEXT NOT NULL DEFAULT '30_days' 
        CHECK (default_payment_terms IN ('14_days', '30_days', 'immediate', 'on_completion')),
    invoice_prefix TEXT DEFAULT 'FACT', -- Prefix for invoice numbering
    next_invoice_number INTEGER DEFAULT 1, -- Auto-incrementing invoice sequence
    
    -- Business settings
    default_btw_rate NUMERIC(4,4) DEFAULT 0.21, -- Dutch standard VAT rate (21%)
    emergency_surcharge_rate NUMERIC(4,4) DEFAULT 0.50, -- 50% surcharge for emergencies
    weekend_surcharge_rate NUMERIC(4,4) DEFAULT 0.25, -- 25% surcharge for weekends
    evening_surcharge_rate NUMERIC(4,4) DEFAULT 0.15, -- 15% surcharge for evenings
    
    -- Voice mode settings
    voice_enabled BOOLEAN DEFAULT true, -- Enable voice controls for invoices
    voice_language TEXT DEFAULT 'nl' CHECK (voice_language IN ('nl', 'en')),
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT true,
    whatsapp_notifications BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure one settings record per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_settings_unique_org 
    ON org_settings(org_id);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_org_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_org_settings_timestamp
    BEFORE UPDATE ON org_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_timestamp();

-- =============================================================================
-- Initial Data
-- =============================================================================

-- Insert default settings for existing organizations
-- This will create safe default settings for all current orgs
INSERT INTO org_settings (org_id)
SELECT id FROM organizations 
WHERE id NOT IN (SELECT org_id FROM org_settings)
ON CONFLICT (org_id) DO NOTHING;