-- Add timezone column to org_settings for per-organization Temporal handling
ALTER TABLE org_settings
	ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Amsterdam';

-- Ensure existing rows pick up the default value
UPDATE org_settings
SET timezone = 'Europe/Amsterdam'
WHERE timezone IS NULL;
