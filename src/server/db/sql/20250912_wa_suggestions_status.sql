-- Migration: 20250912_wa_suggestions_status.sql
-- Purpose: Add approval/rejection status tracking to wa_suggestions table (WhatsApp S4)
-- Date: 2025-09-12

-- Add status columns to wa_suggestions (additive, safe to re-run)
ALTER TABLE wa_suggestions
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('pending','approved','rejected'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;

-- Add performance indexes for status queries
CREATE INDEX IF NOT EXISTS idx_wa_suggestions_status 
  ON wa_suggestions(status, org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_suggestions_job 
  ON wa_suggestions(job_id) 
  WHERE job_id IS NOT NULL;

-- Add documentation comments
COMMENT ON COLUMN wa_suggestions.status IS 'Approval status: pending (default), approved, rejected';
COMMENT ON COLUMN wa_suggestions.approved_at IS 'Timestamp when suggestion was approved (Europe/Amsterdam)';
COMMENT ON COLUMN wa_suggestions.approved_by IS 'User ID who approved the suggestion';
COMMENT ON COLUMN wa_suggestions.rejected_at IS 'Timestamp when suggestion was rejected (Europe/Amsterdam)';
COMMENT ON COLUMN wa_suggestions.rejected_by IS 'User ID who rejected the suggestion';
COMMENT ON COLUMN wa_suggestions.rejection_reason IS 'Human-provided reason for rejection';
COMMENT ON COLUMN wa_suggestions.job_id IS 'Job created from this suggestion (if approved with createJob=true)';