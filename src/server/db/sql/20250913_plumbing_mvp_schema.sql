-- 20250913_plumbing_mvp_schema.sql
-- Plumbing Agent MVP S0 foundation schema expansion

-- Add structured customer contact data
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS phones TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS kvk TEXT,
    ADD COLUMN IF NOT EXISTS btw TEXT,
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Backfill phone array from legacy column
UPDATE customers
SET phones = ARRAY[phone]
WHERE phone IS NOT NULL
  AND (phones IS NULL OR array_length(phones, 1) IS NULL);

UPDATE customers
SET phones = ARRAY[]::TEXT[]
WHERE phones IS NULL;

CREATE OR REPLACE FUNCTION sync_customer_phone_array()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.phones IS NULL OR array_length(NEW.phones, 1) IS NULL THEN
        IF NEW.phone IS NOT NULL THEN
            NEW.phones := ARRAY[NEW.phone];
        ELSE
            NEW.phones := ARRAY[]::TEXT[];
        END IF;
    END IF;

    IF array_length(NEW.phones, 1) IS NULL THEN
        NEW.phone := NULL;
    ELSE
        NEW.phone := NEW.phones[1];
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_customer_phone_array ON customers;
CREATE TRIGGER trg_sync_customer_phone_array
    BEFORE INSERT OR UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION sync_customer_phone_array();

-- Feature flags per organisation
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    value JSONB,
    actor_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_org_flag ON feature_flags (org_id, flag);
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated_at ON feature_flags (updated_at DESC);

-- Project scaffolding
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    client_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    pilot_enabled BOOLEAN NOT NULL DEFAULT false,
    custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);

CREATE TABLE IF NOT EXISTS project_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    company_name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_parties_org ON project_parties(org_id);
CREATE INDEX IF NOT EXISTS idx_project_parties_project ON project_parties(project_id);

-- Customer sites & assets
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Hoofdadres',
    address_line1 TEXT,
    address_line2 TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'NL',
    latitude NUMERIC,
    longitude NUMERIC,
    notes TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sites_org ON sites(org_id);
CREATE INDEX IF NOT EXISTS idx_sites_customer ON sites(customer_id);

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    year_installed INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'retired')),
    custom_fields JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_customer ON assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_assets_site ON assets(site_id);

-- Extend jobs for field execution
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS timer_total_seconds INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS customer_signature BYTEA,
    ADD COLUMN IF NOT EXISTS offline_state JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_jobs_site ON jobs(site_id);

-- Project execution tables
CREATE TABLE IF NOT EXISTS project_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'cancelled')),
    notes TEXT,
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_visits_org ON project_visits(org_id);
CREATE INDEX IF NOT EXISTS idx_project_visits_project ON project_visits(project_id);

CREATE TABLE IF NOT EXISTS project_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES project_visits(id) ON DELETE SET NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary TEXT,
    weather JSONB,
    attendance JSONB,
    blockers JSONB,
    deliveries JSONB,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_daily_logs_org ON project_daily_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_project_daily_logs_project ON project_daily_logs(project_id);

CREATE TABLE IF NOT EXISTS project_rfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence INTEGER,
    title TEXT NOT NULL,
    question TEXT,
    response TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    due_date DATE,
    attachments JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_rfis_org ON project_rfis(org_id);
CREATE INDEX IF NOT EXISTS idx_project_rfis_project ON project_rfis(project_id);

CREATE TABLE IF NOT EXISTS project_change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    impact JSONB,
    assignee UUID REFERENCES employees(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    attachments JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_change_orders_org ON project_change_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_project_change_orders_project ON project_change_orders(project_id);

CREATE TABLE IF NOT EXISTS project_punch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'verified')),
    assignee UUID REFERENCES employees(id) ON DELETE SET NULL,
    due_date DATE,
    location TEXT,
    attachments JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_punch_items_org ON project_punch_items(org_id);
CREATE INDEX IF NOT EXISTS idx_project_punch_items_project ON project_punch_items(project_id);

-- Manuals repository metadata
CREATE TABLE IF NOT EXISTS manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    edition TEXT,
    language TEXT NOT NULL DEFAULT 'nl',
    page_count INTEGER,
    storage_key TEXT NOT NULL,
    checksum TEXT NOT NULL,
    indexed BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manuals_unique ON manuals (COALESCE(org_id, ''), brand, model, COALESCE(edition, ''), language);
CREATE INDEX IF NOT EXISTS idx_manuals_checksum ON manuals(checksum);

-- Structured audit log
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id TEXT,
    actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'service')),
    actor_role TEXT,
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    summary TEXT,
    before JSONB,
    after JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_created ON audit_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);

-- Apply RLS to new tables
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'feature_flags',
    'projects',
    'project_parties',
    'sites',
    'assets',
    'project_visits',
    'project_daily_logs',
    'project_rfis',
    'project_change_orders',
    'project_punch_items',
    'audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I_select_org ON %I;', tbl || '_select_org', tbl);
    EXECUTE format(
      'CREATE POLICY %I_select_org ON %I FOR SELECT USING (org_id = current_org_id());',
      tbl || '_select_org',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I_insert_org ON %I;', tbl || '_insert_org', tbl);
    EXECUTE format(
      'CREATE POLICY %I_insert_org ON %I FOR INSERT WITH CHECK (org_id = current_org_id());',
      tbl || '_insert_org',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I_update_org ON %I;', tbl || '_update_org', tbl);
    EXECUTE format(
      'CREATE POLICY %I_update_org ON %I FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());',
      tbl || '_update_org',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I_delete_org ON %I;', tbl || '_delete_org', tbl);
    EXECUTE format(
      'CREATE POLICY %I_delete_org ON %I FOR DELETE USING (org_id = current_org_id());',
      tbl || '_delete_org',
      tbl
    );

    EXECUTE format('DROP TRIGGER IF EXISTS set_audit_fields ON %I;', tbl);
    EXECUTE format(
      'CREATE TRIGGER set_audit_fields BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_audit_fields();',
      tbl
    );
  END LOOP;
END $$;

-- Manuals allow shared (null org) manuals for global content
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manuals_select_org ON manuals;
CREATE POLICY manuals_select_org ON manuals
FOR SELECT
USING (org_id = current_org_id() OR org_id IS NULL);

DROP POLICY IF EXISTS manuals_insert_org ON manuals;
CREATE POLICY manuals_insert_org ON manuals
FOR INSERT
WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS manuals_update_org ON manuals;
CREATE POLICY manuals_update_org ON manuals
FOR UPDATE
USING (org_id = current_org_id())
WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS manuals_delete_org ON manuals;
CREATE POLICY manuals_delete_org ON manuals
FOR DELETE
USING (org_id = current_org_id());

DROP TRIGGER IF EXISTS set_audit_fields ON manuals;
CREATE TRIGGER set_audit_fields
BEFORE INSERT OR UPDATE ON manuals
FOR EACH ROW EXECUTE FUNCTION set_audit_fields();