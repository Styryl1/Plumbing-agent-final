-- 20250903_invoices_unify_v1.sql
-- Unify three competing invoice systems into single Epic-aligned architecture
-- Additive and safe to run once - keeps legacy tables for migration period
-- 
-- Architecture: invoices + invoice_lines (normalized, cents-only money)
-- Status: drafts are invoices.status='draft' with rows in invoice_lines
-- RLS: TEXT org_id policies using current_org_id() helper

-- ============================================================================
-- 1) Columns & indexes (idempotent)
-- ============================================================================

-- Ensure final columns on invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS number_int INTEGER,
  ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER,
  ADD COLUMN IF NOT EXISTS vat_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS total_cents INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Add status constraint if not exists
DO $$
BEGIN
  -- Drop existing constraint if it exists with different values
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check') THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
  END IF;
  
  -- Add unified status constraint
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
    CHECK (status IN ('draft','sent','paid','overdue','cancelled'));
END$$;

-- Ensure final columns on invoice_lines
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS line_number INTEGER,
  ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS line_total_cents INTEGER,
  ADD COLUMN IF NOT EXISTS vat_rate INTEGER DEFAULT 21;

-- Add vat_rate constraint if not exists
DO $$
BEGIN
  -- Drop existing constraint if it exists with different values
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_vat_rate_check') THEN
    ALTER TABLE invoice_lines DROP CONSTRAINT invoice_lines_vat_rate_check;
  END IF;
  
  -- Add unified vat_rate constraint
  ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_vat_rate_check 
    CHECK (vat_rate IN (0,9,21));
END$$;

-- Add org_id to invoice_lines if missing (for RLS)
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Backfill org_id in invoice_lines from parent invoices where missing
UPDATE invoice_lines 
SET org_id = i.org_id 
FROM invoices i 
WHERE invoice_lines.invoice_id = i.id 
  AND invoice_lines.org_id IS NULL;

-- Make org_id NOT NULL after backfill
ALTER TABLE invoice_lines ALTER COLUMN org_id SET NOT NULL;

-- Add foreign key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoice_lines_org_id_fkey'
  ) THEN
    ALTER TABLE invoice_lines 
      ADD CONSTRAINT invoice_lines_org_id_fkey 
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Unique numbering per org per year (null-safe)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_org_year_number_unique
ON invoices(org_id, year, number_int)
WHERE number_int IS NOT NULL;

-- ============================================================================
-- 2) Single numbering RPC (use org_settings as source of truth)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_org_id TEXT, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Allows function to bypass RLS for atomic updates
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  -- Atomic increment using org_settings as single source of truth
  -- Simple approach: one counter per org (not per year for now)
  UPDATE org_settings
     SET next_invoice_number = COALESCE(next_invoice_number, 1) + 1
   WHERE org_id = p_org_id
   RETURNING next_invoice_number - 1 INTO v_next;

  -- Handle case where org_settings doesn't exist yet
  IF v_next IS NULL THEN
    INSERT INTO org_settings(org_id, next_invoice_number)
    VALUES (p_org_id, 2) -- Start at 1, next will be 2
    ON CONFLICT (org_id) DO UPDATE 
    SET next_invoice_number = org_settings.next_invoice_number + 1
    RETURNING next_invoice_number - 1 INTO v_next;
  END IF;

  -- Return the number that was just reserved
  RETURN COALESCE(v_next, 1);
END;
$$;

-- ============================================================================
-- 3) RLS consolidation (TEXT org_id everywhere)
-- ============================================================================

-- Ensure RLS is enabled on all invoice tables
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments FORCE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts, then recreate unified ones
DO $$
BEGIN
  -- invoices policies
  DROP POLICY IF EXISTS invoices_org_access ON invoices;
  DROP POLICY IF EXISTS select_invoices_own_org ON invoices;
  DROP POLICY IF EXISTS insert_invoices_own_org ON invoices;
  DROP POLICY IF EXISTS update_invoices_own_org ON invoices;
  DROP POLICY IF EXISTS delete_invoices_own_org ON invoices;
  
  -- Create unified invoices policy
  CREATE POLICY invoices_org_access ON invoices
    USING (org_id = current_org_id())
    WITH CHECK (org_id = current_org_id());

  -- invoice_lines policies  
  DROP POLICY IF EXISTS invoice_lines_org_access ON invoice_lines;
  DROP POLICY IF EXISTS select_invoice_lines_own_org ON invoice_lines;
  DROP POLICY IF EXISTS insert_invoice_lines_own_org ON invoice_lines;
  DROP POLICY IF EXISTS update_invoice_lines_own_org ON invoice_lines;
  DROP POLICY IF EXISTS delete_invoice_lines_own_org ON invoice_lines;
  
  -- Create unified invoice_lines policy
  CREATE POLICY invoice_lines_org_access ON invoice_lines
    USING (org_id = current_org_id())
    WITH CHECK (org_id = current_org_id());

  -- invoice_payments policies
  DROP POLICY IF EXISTS invoice_payments_org_access ON invoice_payments;
  DROP POLICY IF EXISTS invoice_payments_select ON invoice_payments;
  DROP POLICY IF EXISTS invoice_payments_insert ON invoice_payments;
  DROP POLICY IF EXISTS invoice_payments_update ON invoice_payments;
  
  -- Create unified invoice_payments policy
  CREATE POLICY invoice_payments_org_access ON invoice_payments
    USING (org_id = current_org_id())
    WITH CHECK (org_id = current_org_id());

END$$;

-- ============================================================================
-- 4) Deprecate duplicates (mark for removal in Batch B2)
-- ============================================================================

-- Add comments to mark tables/functions for removal after migration
COMMENT ON TABLE invoice_drafts IS 'DEPRECATED: Remove in Batch B2 after data migration to invoices table';
COMMENT ON TABLE invoice_number_sequences IS 'DEPRECATED: Remove in Batch B2, replaced by org_settings.next_invoice_number';
COMMENT ON FUNCTION increment_invoice_number IS 'DEPRECATED: Remove in Batch B2, replaced by get_next_invoice_number';

-- Mark legacy columns for removal  
COMMENT ON COLUMN invoices.number IS 'DEPRECATED: Remove in Batch B2, replaced by number_int';
COMMENT ON COLUMN invoices.subtotal_ex_vat IS 'DEPRECATED: Remove in Batch B2, replaced by subtotal_cents';
COMMENT ON COLUMN invoices.vat_total IS 'DEPRECATED: Remove in Batch B2, replaced by vat_amount_cents';
COMMENT ON COLUMN invoices.total_inc_vat IS 'DEPRECATED: Remove in Batch B2, replaced by total_cents';

-- ============================================================================
-- 5) Indexes for performance
-- ============================================================================

-- Core invoice queries
CREATE INDEX IF NOT EXISTS invoices_org_status_idx ON invoices(org_id, status);
CREATE INDEX IF NOT EXISTS invoices_org_created_idx ON invoices(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoice_lines_invoice_org_idx ON invoice_lines(invoice_id, org_id);

-- Payment queries
CREATE INDEX IF NOT EXISTS invoice_payments_invoice_org_idx ON invoice_payments(invoice_id, org_id);
CREATE INDEX IF NOT EXISTS invoice_payments_status_idx ON invoice_payments(status) WHERE status != 'paid';

-- ============================================================================
-- Migration complete - legacy tables preserved for data migration in app code
-- ============================================================================