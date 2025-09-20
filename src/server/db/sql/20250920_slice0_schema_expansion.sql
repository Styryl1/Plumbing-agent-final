-- 20250920_slice0_schema_expansion.sql
-- Slice 0 completion: intake foundations, feature flag platform, project sequencing, job history, and core indexes

-- =============================
-- Helper types
-- =============================

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_type WHERE typname = 'intake_channel'
	) THEN
		CREATE TYPE intake_channel AS ENUM (
			'whatsapp',
			'voice',
			'email',
			'manual'
		);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_type WHERE typname = 'intake_status'
	) THEN
		CREATE TYPE intake_status AS ENUM (
			'pending',
			'processing',
			'scheduled',
			'dismissed'
		);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_type WHERE typname = 'unscheduled_status'
	) THEN
		CREATE TYPE unscheduled_status AS ENUM (
			'pending',
			'applied',
			'dismissed'
		);
	END IF;
END
$$;

-- =============================
-- Intake foundations
-- =============================

CREATE TABLE IF NOT EXISTS intake_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	source intake_channel NOT NULL,
	source_ref TEXT,
	channel intake_channel NOT NULL,
	status intake_status NOT NULL DEFAULT 'pending',
	priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','emergency')),
	received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	discovered_at TIMESTAMPTZ,
	customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
	site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
	summary TEXT,
	details JSONB NOT NULL DEFAULT '{}'::jsonb,
	expires_at TIMESTAMPTZ,
	created_by TEXT,
	updated_by TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intake_voice_calls (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	intake_event_id UUID NOT NULL REFERENCES intake_events(id) ON DELETE CASCADE,
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	provider TEXT NOT NULL CHECK (provider IN ('messagebird','twilio','manual')),
	external_call_id TEXT,
	caller_number TEXT,
	receiver_number TEXT,
	started_at TIMESTAMPTZ,
	ended_at TIMESTAMPTZ,
	duration_seconds INTEGER,
	recording_storage_key TEXT,
	transcript TEXT,
	transcript_language TEXT,
	transcript_confidence NUMERIC,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unscheduled_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	intake_event_id UUID NOT NULL REFERENCES intake_events(id) ON DELETE CASCADE,
	job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
	owner_id UUID REFERENCES employees(id) ON DELETE SET NULL,
	status unscheduled_status NOT NULL DEFAULT 'pending',
	sla_deadline TIMESTAMPTZ,
	priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','emergency')),
	notes TEXT,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT unscheduled_items_intake_unique UNIQUE (org_id, intake_event_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_media_assets (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	message_id UUID NOT NULL REFERENCES wa_messages(id) ON DELETE CASCADE,
	storage_key TEXT NOT NULL,
	content_type TEXT,
	byte_size BIGINT,
	checksum TEXT,
	width INTEGER,
	height INTEGER,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================
-- Job + project history
-- =============================

CREATE TABLE IF NOT EXISTS job_status_history (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
	from_status TEXT,
	to_status TEXT NOT NULL,
	changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	changed_by TEXT,
	note TEXT,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS job_sla_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
	sla_phase TEXT NOT NULL CHECK (sla_phase IN ('ack','dispatch','on_site','complete')),
	previous_state TEXT,
	current_state TEXT NOT NULL,
	deadline TIMESTAMPTZ,
	state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	context JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- =============================
-- Feature flag lifecycle
-- =============================

ALTER TABLE feature_flags
	ADD COLUMN IF NOT EXISTS created_by TEXT,
	ADD COLUMN IF NOT EXISTS updated_by TEXT;

CREATE TABLE IF NOT EXISTS feature_flag_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	flag TEXT NOT NULL,
	previous_enabled BOOLEAN,
	previous_value JSONB,
	new_enabled BOOLEAN,
	new_value JSONB,
	changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	changed_by TEXT,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION log_feature_flag_change() RETURNS trigger AS $$
BEGIN
	INSERT INTO feature_flag_events (
		org_id,
		flag,
		previous_enabled,
		previous_value,
		new_enabled,
		new_value,
		changed_by
	)
	VALUES (
		NEW.org_id,
		NEW.flag,
		OLD.enabled,
		OLD.value,
		NEW.enabled,
		NEW.value,
		NEW.updated_by
	);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_flags_audit ON feature_flags;
CREATE TRIGGER feature_flags_audit
AFTER UPDATE ON feature_flags
FOR EACH ROW
WHEN (OLD.enabled IS DISTINCT FROM NEW.enabled OR OLD.value IS DISTINCT FROM NEW.value)
EXECUTE FUNCTION log_feature_flag_change();

CREATE OR REPLACE VIEW feature_flag_defaults AS
SELECT * FROM (VALUES
	('INTAKE_WHATSAPP', true, '{}'::jsonb),
	('INTAKE_VOICE', true, '{}'::jsonb),
	('JOB_CARDS', true, '{}'::jsonb),
	('PROJECTS_CORE', true, '{}'::jsonb),
	('PROJECTS_ADVANCED', false, '{}'::jsonb),
	('MANUALS_COPILOT', true, '{}'::jsonb),
	('COPILOT_GLOBAL', true, '{}'::jsonb),
	('NOTIFICATIONS_CORE', true, '{}'::jsonb),
	('GDPR_CONSOLE', true, '{}'::jsonb)
) AS defaults(flag, enabled, value);

CREATE OR REPLACE FUNCTION get_org_feature_flags(p_org_id TEXT, p_pilot_mode BOOLEAN DEFAULT FALSE)
RETURNS TABLE(flag TEXT, enabled BOOLEAN, value JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
	WITH effective AS (
		SELECT
			d.flag,
			CASE
				WHEN d.flag = 'PROJECTS_ADVANCED' AND p_pilot_mode THEN true
				ELSE d.enabled
			END AS default_enabled,
			d.value as default_value
		FROM feature_flag_defaults d
	),
	org_flags AS (
		SELECT flag, enabled, value
		FROM feature_flags
		WHERE org_id = p_org_id
	)
	SELECT
		e.flag,
		COALESCE(of.enabled, e.default_enabled) AS enabled,
		COALESCE(of.value, e.default_value) AS value
	FROM effective e
	LEFT JOIN org_flags of USING (flag)
$$;

-- =============================
-- Project sequencing helpers
-- =============================

CREATE OR REPLACE FUNCTION assign_project_sequence()
RETURNS trigger AS $$
DECLARE
	next_seq INTEGER;
BEGIN
	IF NEW.project_id IS NULL THEN
		RETURN NEW;
	END IF;

	IF NEW.sequence IS NULL THEN
		EXECUTE format(
			'SELECT COALESCE(MAX(sequence), 0) + 1 FROM %I WHERE project_id = $1',
			TG_TABLE_NAME
		)
		INTO next_seq
		USING NEW.project_id;
		NEW.sequence := next_seq;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_sequence_project_rfis ON project_rfis;
CREATE TRIGGER set_sequence_project_rfis
BEFORE INSERT ON project_rfis
FOR EACH ROW
EXECUTE FUNCTION assign_project_sequence();

DROP TRIGGER IF EXISTS set_sequence_project_change_orders ON project_change_orders;
CREATE TRIGGER set_sequence_project_change_orders
BEFORE INSERT ON project_change_orders
FOR EACH ROW
EXECUTE FUNCTION assign_project_sequence();

DROP TRIGGER IF EXISTS set_sequence_project_punch_items ON project_punch_items;
CREATE TRIGGER set_sequence_project_punch_items
BEFORE INSERT ON project_punch_items
FOR EACH ROW
EXECUTE FUNCTION assign_project_sequence();

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_rfis_sequence
	ON project_rfis (project_id, sequence);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_change_orders_sequence
	ON project_change_orders (project_id, sequence);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_punch_items_sequence
	ON project_punch_items (project_id, sequence);

-- =============================
-- Data hygiene & sync
-- =============================

-- Backfill customer phones array from legacy phone column if empty
UPDATE customers
SET phones = CASE
	WHEN phone IS NOT NULL AND (phones IS NULL OR array_length(phones, 1) IS NULL)
		THEN ARRAY[phone]
	ELSE phones
END
WHERE phone IS NOT NULL
	AND (phones IS NULL OR array_length(phones, 1) IS NULL);

ALTER TABLE customers
	ADD CONSTRAINT customers_phones_nonempty
	CHECK (phone IS NULL OR array_length(phones, 1) IS NULL OR array_length(phones, 1) > 0);

CREATE INDEX IF NOT EXISTS idx_customers_phones_gin ON customers USING gin (phones);

-- Normalize job status & priority constraints
ALTER TABLE jobs
	DROP CONSTRAINT IF EXISTS jobs_priority_check,
	ADD CONSTRAINT jobs_priority_check CHECK (priority IN ('normal','urgent','emergency')),
	DROP CONSTRAINT IF EXISTS jobs_status_check,
	ADD CONSTRAINT jobs_status_check CHECK (status IN ('unscheduled','scheduled','in_progress','completed','invoiced','cancelled'));

-- =============================
-- Index suite for new tables
-- =============================

CREATE INDEX IF NOT EXISTS idx_intake_events_org_status
	ON intake_events (org_id, status);
CREATE INDEX IF NOT EXISTS idx_intake_events_received
	ON intake_events (org_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_events_customer
	ON intake_events (customer_id);
CREATE INDEX IF NOT EXISTS idx_intake_events_payload_gin
	ON intake_events USING gin (details);

CREATE INDEX IF NOT EXISTS idx_unscheduled_items_org_status
	ON unscheduled_items (org_id, status);
CREATE INDEX IF NOT EXISTS idx_unscheduled_items_deadline
	ON unscheduled_items (org_id, sla_deadline);

CREATE INDEX IF NOT EXISTS idx_intake_voice_calls_event
	ON intake_voice_calls (intake_event_id);
CREATE INDEX IF NOT EXISTS idx_intake_voice_calls_org_time
	ON intake_voice_calls (org_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_status_history_job
	ON job_status_history (org_id, job_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_sla_events_job
	ON job_sla_events (org_id, job_id, sla_phase, state_changed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_media_message
	ON whatsapp_media_assets (message_id);

-- =============================
-- Row level security
-- =============================

DO $$
DECLARE
	tbl TEXT;
BEGIN
	FOREACH tbl IN ARRAY ARRAY[
		'intake_events',
		'intake_voice_calls',
		'unscheduled_items',
		'whatsapp_media_assets',
		'job_status_history',
		'job_sla_events',
		'feature_flag_events'
	] LOOP
		EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
		EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

		EXECUTE format('DROP POLICY IF EXISTS %I_select_org ON %I;', tbl || '_select_org', tbl);
		EXECUTE format('CREATE POLICY %I_select_org ON %I FOR SELECT USING (org_id = current_org_id());', tbl || '_select_org', tbl);

		EXECUTE format('DROP POLICY IF EXISTS %I_insert_org ON %I;', tbl || '_insert_org', tbl);
		EXECUTE format('CREATE POLICY %I_insert_org ON %I FOR INSERT WITH CHECK (org_id = current_org_id());', tbl || '_insert_org', tbl);

		EXECUTE format('DROP POLICY IF EXISTS %I_update_org ON %I;', tbl || '_update_org', tbl);
		EXECUTE format('CREATE POLICY %I_update_org ON %I FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());', tbl || '_update_org', tbl);

		EXECUTE format('DROP POLICY IF EXISTS %I_delete_org ON %I;', tbl || '_delete_org', tbl);
		EXECUTE format('CREATE POLICY %I_delete_org ON %I FOR DELETE USING (org_id = current_org_id());', tbl || '_delete_org', tbl);
	END LOOP;
END
$$;

-- link triggers to set audit fields on new tables
DO $$
DECLARE
	tbl TEXT;
BEGIN
	FOREACH tbl IN ARRAY ARRAY[
		'intake_events',
		'intake_voice_calls',
		'unscheduled_items',
		'whatsapp_media_assets',
		'job_status_history',
		'job_sla_events',
		'feature_flag_events'
	] LOOP
		EXECUTE format('DROP TRIGGER IF EXISTS set_audit_fields ON %I;', tbl);
		EXECUTE format('CREATE TRIGGER set_audit_fields BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_audit_fields();', tbl);
	END LOOP;
END
$$;

-- =============================
-- View for intake dashboard
-- =============================

CREATE OR REPLACE VIEW intake_queue AS
SELECT
	ui.id,
	ui.org_id,
	ui.status,
	ui.priority,
	ui.intake_event_id,
	e.channel,
	e.source,
	e.received_at,
	e.summary,
	e.details,
	e.customer_id,
	e.site_id,
	ui.sla_deadline,
	ui.owner_id,
	ui.created_at,
	ui.updated_at
FROM unscheduled_items ui
JOIN intake_events e ON e.id = ui.intake_event_id;

GRANT SELECT ON intake_queue TO authenticated;
