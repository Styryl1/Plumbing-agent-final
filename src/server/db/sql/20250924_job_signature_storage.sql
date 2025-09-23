-- Add storage key column for job signatures
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS customer_signature_key TEXT;
