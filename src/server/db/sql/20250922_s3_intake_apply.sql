-- 20250922_s3_intake_apply.sql
-- Apply flow support: undoable intake applications

CREATE TABLE IF NOT EXISTS intake_apply_actions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	intake_event_id UUID NOT NULL REFERENCES intake_events(id) ON DELETE CASCADE,
	unscheduled_item_id UUID NOT NULL REFERENCES unscheduled_items(id) ON DELETE CASCADE,
	job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
	created_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
	created_site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
	undo_token UUID NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	created_by TEXT,
	payload JSONB NOT NULL,
	undone_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_intake_apply_actions_org ON intake_apply_actions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_apply_actions_undo ON intake_apply_actions(undo_token) WHERE undone_at IS NULL;

ALTER TABLE intake_apply_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY intake_apply_actions_select ON intake_apply_actions
	FOR SELECT
	USING (org_id = current_org_id());

CREATE POLICY intake_apply_actions_insert ON intake_apply_actions
	FOR INSERT
	WITH CHECK (org_id = current_org_id());

CREATE POLICY intake_apply_actions_update ON intake_apply_actions
	FOR UPDATE
	USING (org_id = current_org_id())
	WITH CHECK (org_id = current_org_id());

CREATE POLICY intake_apply_actions_delete ON intake_apply_actions
	FOR DELETE
	USING (org_id = current_org_id());
