-- 007_rls_full.sql
-- Full, idempotent RLS enablement for all tenant tables
-- Includes helpers, policies, audit triggers, and invoice RPC

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current org_id from JWT claims (core RLS helper)
-- Returns TEXT to match Clerk org IDs (not UUID)
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS text 
LANGUAGE sql 
STABLE
AS $$
  SELECT auth.jwt()->>'org_id';
$$;

-- Check if user has specific role in organization
-- Note: Using employees table for role checking (not memberships)
CREATE OR REPLACE FUNCTION is_member_with_role(p_org text, p_roles text[])
RETURNS boolean 
LANGUAGE sql 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.org_id = p_org
      AND e.user_id = (auth.jwt()->>'sub')  -- Clerk IDs are strings
      AND e.role = ANY(p_roles)
  );
$$;

-- ============================================================================
-- AUDIT TRIGGER (Optional - auto-fill created_by/updated_by)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS trigger 
LANGUAGE plpgsql
AS $$
BEGIN
  -- On INSERT, set created_by and created_at if columns exist
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA 
        AND table_name = TG_TABLE_NAME 
        AND column_name = 'created_by'
    ) THEN
      NEW.created_by := COALESCE(NEW.created_by, auth.jwt()->>'sub');
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA 
        AND table_name = TG_TABLE_NAME 
        AND column_name = 'created_at'
    ) THEN
      NEW.created_at := COALESCE(NEW.created_at, NOW());
    END IF;
  END IF;

  -- Always update updated_by and updated_at if columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'updated_by'
  ) THEN
    NEW.updated_by := auth.jwt()->>'sub';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- RLS POLICIES FOR TENANT TABLES WITH org_id
-- ============================================================================

DO $$
DECLARE
  tbl text;
  has_org_id boolean;
  -- List of all tenant tables that might need RLS
  tables text[] := ARRAY[
    'customers',
    'jobs',
    'employees',
    'invoices',
    'invoice_drafts',
    'org_settings',
    'ai_recommendations',
    'audit_logs',
    'bridge_events',
    'bridge_sessions',
    'conversations',
    'voice_notes',
    'wa_contacts'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Skip if table doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = tbl
    ) THEN
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
      CONTINUE;
    END IF;

    -- Check if table has org_id column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'org_id'
    ) INTO has_org_id;

    IF NOT has_org_id THEN
      RAISE NOTICE 'Table % does not have org_id column, skipping RLS policies', tbl;
      CONTINUE;
    END IF;

    -- Enable RLS (safe to run multiple times)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Drop existing policies if they exist (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'select_own_org_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'insert_own_org_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'update_own_org_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'delete_own_org_' || tbl, tbl);

    -- CREATE POLICIES
    
    -- SELECT: All authenticated users can read their org's data
    EXECUTE format($policy$
      CREATE POLICY %I ON %I FOR SELECT
      USING (org_id = current_org_id());
    $policy$, 'select_own_org_' || tbl, tbl);

    -- INSERT: All authenticated users can insert for their org
    EXECUTE format($policy$
      CREATE POLICY %I ON %I FOR INSERT
      WITH CHECK (org_id = current_org_id());
    $policy$, 'insert_own_org_' || tbl, tbl);

    -- UPDATE: Special handling for org_settings (owner/admin only)
    IF tbl = 'org_settings' THEN
      EXECUTE format($policy$
        CREATE POLICY %I ON %I FOR UPDATE
        USING (
          org_id = current_org_id() 
          AND is_member_with_role(current_org_id(), ARRAY['owner', 'admin'])
        )
        WITH CHECK (
          org_id = current_org_id()
          AND is_member_with_role(current_org_id(), ARRAY['owner', 'admin'])
        );
      $policy$, 'update_own_org_' || tbl, tbl);
    ELSE
      -- Regular UPDATE: All authenticated users can update their org's data
      EXECUTE format($policy$
        CREATE POLICY %I ON %I FOR UPDATE
        USING (org_id = current_org_id())
        WITH CHECK (org_id = current_org_id());
      $policy$, 'update_own_org_' || tbl, tbl);
    END IF;

    -- DELETE: Granular permissions based on table
    IF tbl IN ('customers', 'jobs', 'invoices', 'invoice_drafts') THEN
      -- Critical business data: admin/owner only
      EXECUTE format($policy$
        CREATE POLICY %I ON %I FOR DELETE
        USING (
          org_id = current_org_id()
          AND is_member_with_role(current_org_id(), ARRAY['owner', 'admin'])
        );
      $policy$, 'delete_own_org_' || tbl, tbl);
    ELSIF tbl = 'org_settings' THEN
      -- Org settings should never be deleted
      -- No DELETE policy = no deletes allowed
      RAISE NOTICE 'No DELETE policy for org_settings (deletes not allowed)';
    ELSE
      -- Other tables: normal members can delete
      EXECUTE format($policy$
        CREATE POLICY %I ON %I FOR DELETE
        USING (org_id = current_org_id());
      $policy$, 'delete_own_org_' || tbl, tbl);
    END IF;

    -- Attach audit trigger if not already attached
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS set_audit_fields ON %I;', tbl);
      EXECUTE format($trigger$
        CREATE TRIGGER set_audit_fields
        BEFORE INSERT OR UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
      $trigger$, tbl);
    EXCEPTION 
      WHEN OTHERS THEN
        -- Ignore trigger creation errors (e.g., permission issues)
        RAISE NOTICE 'Could not create audit trigger for %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- RLS POLICIES FOR JUNCTION TABLES (no direct org_id)
-- ============================================================================

-- job_assignees: Junction table between jobs and employees
-- Derives org_id through the jobs table
DO $$
BEGIN
  -- Check if job_assignees table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'job_assignees'
  ) THEN
    -- Enable RLS
    ALTER TABLE job_assignees ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist (idempotent)
    DROP POLICY IF EXISTS select_via_job_org ON job_assignees;
    DROP POLICY IF EXISTS insert_via_job_org ON job_assignees;
    DROP POLICY IF EXISTS update_via_job_org ON job_assignees;
    DROP POLICY IF EXISTS delete_via_job_org ON job_assignees;

    -- SELECT: Can view assignees for jobs in their org
    CREATE POLICY select_via_job_org ON job_assignees FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.id = job_assignees.job_id
          AND j.org_id = current_org_id()
      )
    );

    -- INSERT: Can assign employees to jobs in their org
    CREATE POLICY insert_via_job_org ON job_assignees FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.id = job_assignees.job_id
          AND j.org_id = current_org_id()
      )
      AND EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = job_assignees.employee_id
          AND e.org_id = current_org_id()
      )
    );

    -- UPDATE: Can update assignees for jobs in their org
    CREATE POLICY update_via_job_org ON job_assignees FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.id = job_assignees.job_id
          AND j.org_id = current_org_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.id = job_assignees.job_id
          AND j.org_id = current_org_id()
      )
      AND EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = job_assignees.employee_id
          AND e.org_id = current_org_id()
      )
    );

    -- DELETE: Can remove assignees from jobs in their org
    CREATE POLICY delete_via_job_org ON job_assignees FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.id = job_assignees.job_id
          AND j.org_id = current_org_id()
      )
    );

    RAISE NOTICE 'RLS policies created for job_assignees junction table';
  END IF;
END $$;

-- ============================================================================
-- SECURITY DEFINER FUNCTION: Issue Invoice (Atomic Numbering)
-- ============================================================================

CREATE OR REPLACE FUNCTION issue_invoice(p_invoice_id uuid)
RETURNS invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Prevent search_path hijacking
AS $$
DECLARE
  v_org text := current_org_id();
  v_next_no integer;
  v_inv invoices;
BEGIN
  -- Validate org context
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'ORG_MISSING: No organization context in JWT';
  END IF;

  -- Atomic increment of invoice number within org
  UPDATE org_settings
  SET next_invoice_no = next_invoice_no + 1
  WHERE org_id = v_org
  RETURNING next_invoice_no INTO v_next_no;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORG_SETTINGS_NOT_FOUND: Organization settings not initialized';
  END IF;

  -- Issue the invoice with the new number
  UPDATE invoices
  SET 
    status = 'issued',
    issued_at = NOW(),
    number = v_next_no::text
  WHERE id = p_invoice_id
    AND org_id = v_org
    AND status = 'draft'  -- Can only issue drafts
  RETURNING * INTO v_inv;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND_OR_FORBIDDEN: Invoice not found, not in draft status, or belongs to different org';
  END IF;

  RETURN v_inv;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION issue_invoice TO authenticated;

-- ============================================================================
-- RLS COVERAGE SELF-CHECK
-- ============================================================================

-- Ensure every table with org_id has RLS enabled
DO $$
DECLARE
  r record;
  missing_rls text[] := ARRAY[]::text[];
BEGIN
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
    RAISE WARNING 'Tables with org_id but missing RLS: %', array_to_string(missing_rls, ', ');
  ELSE
    RAISE NOTICE 'RLS coverage check passed: All tables with org_id have RLS enabled';
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- List all tables with RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'customers', 'jobs', 'job_assignees', 'employees', 
    'invoices', 'invoice_drafts', 'org_settings',
    'ai_recommendations', 'audit_logs', 'bridge_events',
    'bridge_sessions', 'conversations', 'voice_notes', 'wa_contacts'
  )
ORDER BY tablename;