-- 021_wa_numbers.sql
-- Maps Meta phone_number_id -> org_id, supports two-number model (business/control)

CREATE TABLE IF NOT EXISTS wa_numbers (
  phone_number_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label TEXT CHECK (label IN ('business', 'control')) DEFAULT 'business',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wa_numbers ENABLE ROW LEVEL SECURITY;

-- Webhook handlers use service role; allow full access with service role
DO $$ BEGIN
  CREATE POLICY wa_numbers_service_role ON wa_numbers
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to read their org's numbers
CREATE POLICY IF NOT EXISTS wa_numbers_select ON wa_numbers
  FOR SELECT USING (
    auth.jwt() ->> 'org_id' = org_id
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wa_numbers_org_id ON wa_numbers(org_id);