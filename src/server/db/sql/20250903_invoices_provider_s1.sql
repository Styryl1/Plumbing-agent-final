-- S1: Provider domain/data model (additive migration)
-- Add provider columns without breaking existing functionality
-- This establishes foundation for external provider integration

-- Add provider-related columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS provider text 
    CHECK (provider IN ('moneybird','wefact','eboekhouden','peppol')),
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS payment_url text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS ubl_url text,
  ADD COLUMN IF NOT EXISTS message_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false;

-- Mark all existing invoices with internal numbers as legacy
-- This preserves historical data while establishing new provider-based flow
UPDATE invoices SET is_legacy = true 
WHERE (number IS NOT NULL OR number_int IS NOT NULL) 
  AND is_legacy = false;

-- Add performance indexes for provider-based queries
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices(provider);
CREATE INDEX IF NOT EXISTS idx_invoices_external_id ON invoices(external_id);
CREATE INDEX IF NOT EXISTS idx_invoices_legacy ON invoices(is_legacy) 
  WHERE is_legacy = false; -- Partial index for new provider-based invoices

-- Add index for provider status filtering
CREATE INDEX IF NOT EXISTS idx_invoices_provider_status ON invoices(provider_status) 
  WHERE provider_status IS NOT NULL;

-- Document the deprecation of internal numbering
COMMENT ON COLUMN invoices.number IS 
  'DEPRECATED: Only for legacy invoices. New invoices use provider numbering via external_id';
COMMENT ON COLUMN invoices.number_int IS 
  'DEPRECATED: Only for legacy invoices. New invoices use provider numbering via external_id';

-- Ensure RLS policies continue to work with new columns
-- The existing RLS policies on invoices table will automatically apply to new columns