-- S10 Customer Portal tokens & flags
-- Adds secure token fields for customer self-service portal access

BEGIN;

-- Ensure pgcrypto extension for gen_random_uuid (if not already installed)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS customer_portal_token TEXT,
    ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS customer_can_reschedule BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill existing rows with secure tokens
UPDATE jobs
SET customer_portal_token = gen_random_uuid()::text
WHERE customer_portal_token IS NULL;

-- Backfill token expiry: default 14 days after now when start date absent
UPDATE jobs
SET token_expires_at = COALESCE(
        starts_at + INTERVAL '14 days',
        now() + INTERVAL '14 days'
    )
WHERE token_expires_at IS NULL;

ALTER TABLE jobs
    ALTER COLUMN customer_portal_token SET NOT NULL,
    ALTER COLUMN customer_portal_token SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN token_expires_at SET DEFAULT (now() + INTERVAL '14 days');

-- Unique token per job across all orgs
ALTER TABLE jobs
    ADD CONSTRAINT jobs_customer_portal_token_key UNIQUE (customer_portal_token);

-- Helpful composite index for token lookup within tenant
CREATE INDEX IF NOT EXISTS idx_jobs_org_portal_token ON jobs(org_id, customer_portal_token);

-- Support fast lookups by org & start time for slot generation
CREATE INDEX IF NOT EXISTS idx_jobs_org_starts_at ON jobs(org_id, starts_at);

COMMIT;
