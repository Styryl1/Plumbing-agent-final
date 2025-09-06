-- 008_rls_complete.sql
-- Complete RLS coverage for ALL remaining tables
-- Fixes critical gaps: organizations, materials, voice_notes, storage

-- ============================================================================
-- CRITICAL FIX: Organizations Table (Currently EXPOSED!)
-- ============================================================================

-- Organizations table: users only see orgs they belong to
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS select_member_orgs ON organizations;
DROP POLICY IF EXISTS update_own_org ON organizations;

-- SELECT: Only see organizations you're a member of
CREATE POLICY select_member_orgs ON organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.org_id = organizations.id
      AND e.user_id = auth.jwt()->>'sub'
  )
);

-- UPDATE: Only owners/admins can update org details
CREATE POLICY update_own_org ON organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.org_id = organizations.id
      AND e.user_id = auth.jwt()->>'sub'
      AND e.role = ANY(ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.org_id = organizations.id
      AND e.user_id = auth.jwt()->>'sub'
      AND e.role = ANY(ARRAY['owner', 'admin'])
  )
);

-- No INSERT/DELETE policies - orgs created via Clerk webhook only

-- ============================================================================
-- FIX: Materials Table (Pricing Data EXPOSED!)
-- ============================================================================

-- Materials table has org_id but no RLS!
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS select_own_org_materials ON materials;
DROP POLICY IF EXISTS insert_own_org_materials ON materials;
DROP POLICY IF EXISTS update_own_org_materials ON materials;
DROP POLICY IF EXISTS delete_own_org_materials ON materials;

-- SELECT: Only see your org's materials
CREATE POLICY select_own_org_materials ON materials FOR SELECT
USING (org_id = current_org_id());

-- INSERT: Add materials to your org
CREATE POLICY insert_own_org_materials ON materials FOR INSERT
WITH CHECK (org_id = current_org_id());

-- UPDATE: Update your org's materials
CREATE POLICY update_own_org_materials ON materials FOR UPDATE
USING (org_id = current_org_id())
WITH CHECK (org_id = current_org_id());

-- DELETE: Admin/owner only
CREATE POLICY delete_own_org_materials ON materials FOR DELETE
USING (
  org_id = current_org_id()
  AND is_member_with_role(current_org_id(), ARRAY['owner', 'admin'])
);

-- ============================================================================
-- FIX: Voice Notes (No org_id - derive through jobs)
-- ============================================================================

-- Voice notes don't have org_id, must check via job relationship
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS select_via_job_org ON voice_notes;
DROP POLICY IF EXISTS insert_via_job_org ON voice_notes;
DROP POLICY IF EXISTS update_via_job_org ON voice_notes;
DROP POLICY IF EXISTS delete_via_job_org ON voice_notes;

-- SELECT: Can see voice notes for jobs in your org
CREATE POLICY select_via_job_org ON voice_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = voice_notes.job_id
      AND j.org_id = current_org_id()
  )
  OR 
  EXISTS (
    SELECT 1 FROM invoice_drafts d
    WHERE d.id = voice_notes.invoice_draft_id
      AND d.org_id = current_org_id()
  )
);

-- INSERT: Can add voice notes to jobs in your org
CREATE POLICY insert_via_job_org ON voice_notes FOR INSERT
WITH CHECK (
  (
    job_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = voice_notes.job_id
        AND j.org_id = current_org_id()
    )
  )
  OR
  (
    invoice_draft_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM invoice_drafts d
      WHERE d.id = voice_notes.invoice_draft_id
        AND d.org_id = current_org_id()
    )
  )
);

-- UPDATE: Can update voice notes for jobs in your org
CREATE POLICY update_via_job_org ON voice_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = voice_notes.job_id
      AND j.org_id = current_org_id()
  )
  OR 
  EXISTS (
    SELECT 1 FROM invoice_drafts d
    WHERE d.id = voice_notes.invoice_draft_id
      AND d.org_id = current_org_id()
  )
)
WITH CHECK (
  (
    job_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = voice_notes.job_id
        AND j.org_id = current_org_id()
    )
  )
  OR
  (
    invoice_draft_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM invoice_drafts d
      WHERE d.id = voice_notes.invoice_draft_id
        AND d.org_id = current_org_id()
    )
  )
);

-- DELETE: Can delete voice notes for jobs in your org
CREATE POLICY delete_via_job_org ON voice_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = voice_notes.job_id
      AND j.org_id = current_org_id()
  )
  OR 
  EXISTS (
    SELECT 1 FROM invoice_drafts d
    WHERE d.id = voice_notes.invoice_draft_id
      AND d.org_id = current_org_id()
  )
);

-- ============================================================================
-- FIX: Invoice Lines (No org_id - derive through invoices)
-- ============================================================================

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS select_via_invoice_org ON invoice_lines;
DROP POLICY IF EXISTS insert_via_invoice_org ON invoice_lines;
DROP POLICY IF EXISTS update_via_invoice_org ON invoice_lines;
DROP POLICY IF EXISTS delete_via_invoice_org ON invoice_lines;

-- All policies derive org through invoice relationship
CREATE POLICY select_via_invoice_org ON invoice_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND i.org_id = current_org_id()
  )
);

CREATE POLICY insert_via_invoice_org ON invoice_lines FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND i.org_id = current_org_id()
  )
);

CREATE POLICY update_via_invoice_org ON invoice_lines FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND i.org_id = current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND i.org_id = current_org_id()
  )
);

CREATE POLICY delete_via_invoice_org ON invoice_lines FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND i.org_id = current_org_id()
  )
);

-- ============================================================================
-- FIX: Job Materials (No org_id - derive through jobs)
-- ============================================================================

ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS select_via_job_org_materials ON job_materials;
DROP POLICY IF EXISTS insert_via_job_org_materials ON job_materials;
DROP POLICY IF EXISTS update_via_job_org_materials ON job_materials;
DROP POLICY IF EXISTS delete_via_job_org_materials ON job_materials;

CREATE POLICY select_via_job_org_materials ON job_materials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_materials.job_id
      AND j.org_id = current_org_id()
  )
);

CREATE POLICY insert_via_job_org_materials ON job_materials FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_materials.job_id
      AND j.org_id = current_org_id()
  )
  AND (
    material_id IS NULL OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = job_materials.material_id
        AND m.org_id = current_org_id()
    )
  )
);

CREATE POLICY update_via_job_org_materials ON job_materials FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_materials.job_id
      AND j.org_id = current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_materials.job_id
      AND j.org_id = current_org_id()
  )
  AND (
    material_id IS NULL OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = job_materials.material_id
        AND m.org_id = current_org_id()
    )
  )
);

CREATE POLICY delete_via_job_org_materials ON job_materials FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_materials.job_id
      AND j.org_id = current_org_id()
  )
);

-- ============================================================================
-- TIGHTEN: Org Settings (Admin/Owner Only for Updates)
-- ============================================================================

-- Drop and recreate update policy to be more restrictive
DROP POLICY IF EXISTS update_own_org_org_settings ON org_settings;

CREATE POLICY update_own_org_org_settings ON org_settings FOR UPDATE
USING (
  org_id = current_org_id()
  AND is_member_with_role(current_org_id(), ARRAY['owner', 'admin'])
)
WITH CHECK (
  org_id = current_org_id()
  AND is_member_with_role(current_org_id(), ARRAY['owner', 'admin'])
);

-- ============================================================================
-- STORAGE BUCKET POLICIES (Org-Isolated File Access)
-- ============================================================================

-- Storage uses path convention: org/{org_id}/...
-- Create policies for common buckets

-- Invoices bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if any
DROP POLICY IF EXISTS invoices_read_own_org ON storage.objects;
DROP POLICY IF EXISTS invoices_write_own_org ON storage.objects;
DROP POLICY IF EXISTS invoices_update_own_org ON storage.objects;
DROP POLICY IF EXISTS invoices_delete_admin_only ON storage.objects;

-- Read own org's invoice PDFs
CREATE POLICY invoices_read_own_org ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
);

-- Write invoice PDFs to own org folder
CREATE POLICY invoices_write_own_org ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
);

-- Update own org's invoice PDFs
CREATE POLICY invoices_update_own_org ON storage.objects FOR UPDATE
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
)
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
);

-- Delete restricted to admin/owner
CREATE POLICY invoices_delete_admin_only ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
  AND is_member_with_role((auth.jwt()->>'org_id')::text, ARRAY['owner', 'admin'])
);

-- Media bucket (for job photos, voice notes, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', false, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- Drop existing media policies if any
DROP POLICY IF EXISTS media_read_own_org ON storage.objects;
DROP POLICY IF EXISTS media_write_own_org ON storage.objects;
DROP POLICY IF EXISTS media_update_own_org ON storage.objects;
DROP POLICY IF EXISTS media_delete_own_org ON storage.objects;

CREATE POLICY media_read_own_org ON storage.objects FOR SELECT
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
);

CREATE POLICY media_write_own_org ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
);

CREATE POLICY media_update_own_org ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
);

CREATE POLICY media_delete_own_org ON storage.objects FOR DELETE
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[2] = auth.jwt()->>'org_id'
);

-- ============================================================================
-- PERFORMANCE INDEXES (Critical for RLS Performance)
-- ============================================================================

-- Org-scoped indexes for fast RLS filtering
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_org ON materials(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_drafts_org ON invoice_drafts(org_id);
CREATE INDEX IF NOT EXISTS idx_org_settings_org ON org_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_org ON ai_recommendations(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_bridge_events_org ON bridge_events(org_id);
CREATE INDEX IF NOT EXISTS idx_bridge_sessions_org ON bridge_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_org ON wa_contacts(org_id);

-- Relationship indexes for derived RLS checks
CREATE INDEX IF NOT EXISTS idx_voice_notes_job ON voice_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_draft ON voice_notes(invoice_draft_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_material ON job_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_job_assignees_job ON job_assignees(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignees_employee ON job_assignees(employee_id);

-- ============================================================================
-- TIGHTEN FUNCTION SECURITY
-- ============================================================================

-- Revoke public access from sensitive functions
REVOKE ALL ON FUNCTION issue_invoice FROM public, anon;
GRANT EXECUTE ON FUNCTION issue_invoice TO authenticated;

-- Set explicit search_path on all functions
ALTER FUNCTION current_org_id() SET search_path = public;
ALTER FUNCTION is_member_with_role(text, text[]) SET search_path = public;
ALTER FUNCTION set_audit_fields() SET search_path = public;
ALTER FUNCTION issue_invoice(uuid) SET search_path = public;

-- ============================================================================
-- FORCE RLS (Defense in Depth)
-- ============================================================================

-- Force RLS on all tables with sensitive data
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE materials FORCE ROW LEVEL SECURITY;
ALTER TABLE voice_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE job_materials FORCE ROW LEVEL SECURITY;
ALTER TABLE job_assignees FORCE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE org_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE bridge_events FORCE ROW LEVEL SECURITY;
ALTER TABLE bridge_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE wa_contacts FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- FINAL RLS COVERAGE CHECK
-- ============================================================================

DO $$
DECLARE
  r record;
  missing_rls text[] := ARRAY[]::text[];
BEGIN
  -- Check for any table with org_id that lacks RLS
  FOR r IN
    SELECT DISTINCT t.table_schema, t.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema 
      AND t.table_name = c.table_name
    WHERE t.table_schema = 'public'
      AND c.column_name = 'org_id'
      AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_class pc
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace
        WHERE pn.nspname = t.table_schema
          AND pc.relname = t.table_name
          AND pc.relrowsecurity = true
      )
  LOOP
    missing_rls := array_append(missing_rls, r.table_schema || '.' || r.table_name);
  END LOOP;

  IF array_length(missing_rls, 1) > 0 THEN
    RAISE EXCEPTION 'CRITICAL: Tables with org_id but NO RLS: %', array_to_string(missing_rls, ', ');
  END IF;

  RAISE NOTICE '✅ RLS coverage complete: All tables with org_id have RLS enabled';
END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

SELECT 
  'RLS Security Hardening Complete' as status,
  COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls,
  COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls
FROM pg_tables 
WHERE schemaname = 'public';