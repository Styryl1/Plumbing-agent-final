-- 011_rls_third_party_clerk.sql
-- Migrate to Clerk Third-Party JWT + TEXT org_id policies
-- Idempotent: safe to run multiple times

-- ============================================================================
-- 1) Ensure helper functions exist (from 007_rls_full.sql)
--    current_org_id(): TEXT, is_member_with_role(org TEXT, roles TEXT[])
-- ============================================================================
-- (No-op here; 007 already defines them. We just depend on them.)

-- ============================================================================
-- 2) Drop any legacy UUID-cast policies that conflict with TEXT org_id
-- ============================================================================
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('invoices','invoice_drafts','org_settings')
      AND policydef LIKE '%::uuid%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END$$;

-- ============================================================================
-- 3) Ensure RLS is enabled and policies use current_org_id() (TEXT)
-- ============================================================================
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS org_settings ENABLE ROW LEVEL SECURITY;

-- Re-create policies idempotently for invoices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='select_invoices_own_org') THEN
    CREATE POLICY select_invoices_own_org ON invoices FOR SELECT USING (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='insert_invoices_own_org') THEN
    CREATE POLICY insert_invoices_own_org ON invoices FOR INSERT WITH CHECK (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='update_invoices_own_org') THEN
    CREATE POLICY update_invoices_own_org ON invoices FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='delete_invoices_own_org') THEN
    CREATE POLICY delete_invoices_own_org ON invoices FOR DELETE USING (org_id = current_org_id());
  END IF;
END$$;

-- Re-create policies for invoice_drafts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoice_drafts' AND policyname='select_drafts_own_org') THEN
    CREATE POLICY select_drafts_own_org ON invoice_drafts FOR SELECT USING (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoice_drafts' AND policyname='insert_drafts_own_org') THEN
    CREATE POLICY insert_drafts_own_org ON invoice_drafts FOR INSERT WITH CHECK (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoice_drafts' AND policyname='update_drafts_own_org') THEN
    CREATE POLICY update_drafts_own_org ON invoice_drafts FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoice_drafts' AND policyname='delete_drafts_own_org') THEN
    CREATE POLICY delete_drafts_own_org ON invoice_drafts FOR DELETE USING (org_id = current_org_id());
  END IF;
END$$;

-- Re-create policies for org_settings (no DELETE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_settings' AND policyname='select_org_settings_own_org') THEN
    CREATE POLICY select_org_settings_own_org ON org_settings FOR SELECT USING (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_settings' AND policyname='insert_org_settings_own_org') THEN
    CREATE POLICY insert_org_settings_own_org ON org_settings FOR INSERT WITH CHECK (org_id = current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_settings' AND policyname='update_org_settings_own_org') THEN
    CREATE POLICY update_org_settings_own_org ON org_settings FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
  END IF;
END$$;

-- Optional: quick status
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('invoices','invoice_drafts','org_settings')
ORDER BY tablename, policyname;