-- Restore multi-assignee support for jobs (Schedule-X lanes)
-- Reintroduces job_assignees junction table with org-scoped RLS and triggers

BEGIN;

CREATE TABLE IF NOT EXISTS job_assignees (
	job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
	employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
	org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	is_primary BOOLEAN NOT NULL DEFAULT false,
	assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	assigned_by TEXT,
	PRIMARY KEY (job_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignees_job ON job_assignees(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignees_employee ON job_assignees(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_assignees_org ON job_assignees(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_assignees_primary_per_job
	ON job_assignees(job_id)
	WHERE is_primary;

DROP FUNCTION IF EXISTS job_assignees_enforce_org() CASCADE;
CREATE FUNCTION job_assignees_enforce_org()
RETURNS TRIGGER AS $$
DECLARE
	job_org TEXT;
	employee_org TEXT;
BEGIN
	SELECT org_id INTO job_org FROM jobs WHERE id = NEW.job_id;
	IF job_org IS NULL THEN
		RAISE EXCEPTION 'Job % not found when assigning employee', NEW.job_id;
	END IF;

	SELECT org_id INTO employee_org FROM employees WHERE id = NEW.employee_id;
	IF employee_org IS NULL THEN
		RAISE EXCEPTION 'Employee % not found for assignment', NEW.employee_id;
	END IF;

	IF employee_org <> job_org THEN
		RAISE EXCEPTION 'Employee % does not belong to the same organisation as job %', NEW.employee_id, NEW.job_id;
	END IF;

	NEW.org_id := job_org;

	IF NEW.is_primary THEN
		UPDATE job_assignees
		SET is_primary = false
		WHERE job_id = NEW.job_id
			AND employee_id <> NEW.employee_id
			AND is_primary = true;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS job_assignees_sync_primary() CASCADE;
CREATE FUNCTION job_assignees_sync_primary()
RETURNS TRIGGER AS $$
DECLARE
	target_job UUID := COALESCE(NEW.job_id, OLD.job_id);
	current_primary UUID;
BEGIN
	IF target_job IS NULL THEN
		RETURN COALESCE(NEW, OLD);
	END IF;

	SELECT employee_id INTO current_primary
	FROM job_assignees
	WHERE job_id = target_job
		AND is_primary = true
	ORDER BY assigned_at DESC
	LIMIT 1;

	UPDATE jobs
	SET employee_id = current_primary,
		updated_at = now()
	WHERE id = target_job;

	RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_assignees_enforce_org_trigger ON job_assignees;
CREATE TRIGGER job_assignees_enforce_org_trigger
	BEFORE INSERT OR UPDATE ON job_assignees
	FOR EACH ROW
	EXECUTE FUNCTION job_assignees_enforce_org();

DROP TRIGGER IF EXISTS job_assignees_sync_primary_trigger ON job_assignees;
CREATE TRIGGER job_assignees_sync_primary_trigger
	AFTER INSERT OR UPDATE OR DELETE ON job_assignees
	FOR EACH ROW
	EXECUTE FUNCTION job_assignees_sync_primary();

INSERT INTO job_assignees (job_id, employee_id, org_id, is_primary, assigned_at, assigned_by)
SELECT
	j.id,
	j.employee_id,
	j.org_id,
	true,
	COALESCE(j.updated_at, j.created_at, now()),
	NULL
FROM jobs j
WHERE j.employee_id IS NOT NULL
ON CONFLICT (job_id, employee_id) DO NOTHING;

ALTER TABLE job_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_assignees_select ON job_assignees;
DROP POLICY IF EXISTS job_assignees_insert ON job_assignees;
DROP POLICY IF EXISTS job_assignees_update ON job_assignees;
DROP POLICY IF EXISTS job_assignees_delete ON job_assignees;

CREATE POLICY job_assignees_select ON job_assignees
	FOR SELECT USING (org_id = current_org_id());

CREATE POLICY job_assignees_insert ON job_assignees
	FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY job_assignees_update ON job_assignees
	FOR UPDATE USING (org_id = current_org_id())
	WITH CHECK (org_id = current_org_id());

CREATE POLICY job_assignees_delete ON job_assignees
	FOR DELETE USING (org_id = current_org_id());

ALTER TABLE job_assignees FORCE ROW LEVEL SECURITY;

COMMIT;
