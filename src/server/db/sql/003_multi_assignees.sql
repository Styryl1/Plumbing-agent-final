-- Multi-Assignee Schema Migration
-- Purpose: Support multiple employees per job with primary/secondary roles
-- Date: August 2025
-- Phase: Schedule-X Calendar Multi-assignee Support

-- =============================================================================
-- Job Assignees M2M Table
-- =============================================================================

-- Many-to-many relationship between jobs and employees
CREATE TABLE IF NOT EXISTS job_assignees (
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by TEXT, -- Clerk user ID who made the assignment
    
    -- Composite primary key
    PRIMARY KEY (job_id, employee_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_job_assignees_job_id ON job_assignees(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignees_employee_id ON job_assignees(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_assignees_is_primary ON job_assignees(is_primary);

-- =============================================================================
-- Triggers for Data Consistency
-- =============================================================================

-- Trigger function: Mirror primary assignee to jobs.employee_id for back-compat
CREATE OR REPLACE FUNCTION sync_primary_assignee()
RETURNS TRIGGER AS $$
BEGIN
    -- When inserting/updating job_assignees
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- If this is now the primary assignee
        IF NEW.is_primary THEN
            -- Unset any other primary assignees for this job
            UPDATE job_assignees 
            SET is_primary = false 
            WHERE job_id = NEW.job_id AND employee_id != NEW.employee_id AND is_primary = true;
            
            -- Update the main jobs table
            UPDATE jobs 
            SET employee_id = NEW.employee_id, updated_at = now()
            WHERE id = NEW.job_id;
        END IF;
        RETURN NEW;
    END IF;

    -- When deleting job_assignees
    IF TG_OP = 'DELETE' THEN
        -- If we're deleting the primary assignee
        IF OLD.is_primary THEN
            -- Clear the main jobs table
            UPDATE jobs 
            SET employee_id = NULL, updated_at = now()
            WHERE id = OLD.job_id;
            
            -- Optionally promote another assignee to primary
            -- (Uncomment if you want automatic promotion)
            /*
            UPDATE job_assignees 
            SET is_primary = true
            WHERE job_id = OLD.job_id 
            AND employee_id = (
                SELECT employee_id FROM job_assignees 
                WHERE job_id = OLD.job_id 
                ORDER BY assigned_at ASC 
                LIMIT 1
            );
            */
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_sync_primary_assignee ON job_assignees;
CREATE TRIGGER trigger_sync_primary_assignee
    AFTER INSERT OR UPDATE OR DELETE ON job_assignees
    FOR EACH ROW
    EXECUTE FUNCTION sync_primary_assignee();

-- =============================================================================
-- Migration: Populate existing assignments
-- =============================================================================

-- Migrate existing jobs.employee_id to job_assignees table
INSERT INTO job_assignees (job_id, employee_id, is_primary, assigned_at)
SELECT 
    id as job_id,
    employee_id,
    true as is_primary,  -- Existing assignments are primary
    created_at as assigned_at
FROM jobs 
WHERE employee_id IS NOT NULL
ON CONFLICT (job_id, employee_id) DO NOTHING;

-- =============================================================================
-- Helper Views (Optional)
-- =============================================================================

-- View for easy querying of job assignments
CREATE OR REPLACE VIEW job_assignments AS
SELECT 
    j.id as job_id,
    j.title,
    j.starts_at,
    j.ends_at,
    j.status,
    e.id as employee_id,
    e.name as employee_name,
    e.color as employee_color,
    ja.is_primary,
    ja.assigned_at
FROM jobs j
JOIN job_assignees ja ON j.id = ja.job_id
JOIN employees e ON ja.employee_id = e.id
WHERE e.active = true
ORDER BY j.starts_at, ja.is_primary DESC;

-- View for primary assignments only (back-compat)
CREATE OR REPLACE VIEW job_primary_assignments AS
SELECT * FROM job_assignments WHERE is_primary = true;

-- =============================================================================
-- Verification Queries (for testing)
-- =============================================================================

-- Uncomment to verify the migration worked:
/*
-- Check that existing jobs now have assignee records
SELECT 
    'Migrated assignments:' as info,
    COUNT(*) as count 
FROM job_assignees WHERE is_primary = true;

-- Check trigger works by updating a job assignment
-- This should update both job_assignees and jobs.employee_id
*/