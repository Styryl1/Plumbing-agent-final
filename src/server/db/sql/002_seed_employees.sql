-- Employee Seeding Migration
-- Purpose: Add demo employees to resolve "Geen medewerkers beschikbaar"
-- Date: August 2025
-- Phase: Schedule-X Calendar Development

-- This migration seeds the employees table with demo data
-- Replace the org_id values with your actual test organization ID

-- Demo employees for testing (update org_id to match your test org)
INSERT INTO employees (id, org_id, user_id, role, name, color, active) VALUES
(
    'e1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6',
    'org_2oq5HDaZE9bWQKGE73vb8iFE2bk', -- Replace with your actual org_id
    'user_demo_jan',
    'staff',
    'Jan van der Berg',
    '#3B82F6', -- Blue
    true
),
(
    'e2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7',
    'org_2oq5HDaZE9bWQKGE73vb8iFE2bk', -- Replace with your actual org_id
    'user_demo_piet',
    'staff',
    'Piet Janssen',
    '#10B981', -- Green
    true
),
(
    'e3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8',
    'org_2oq5HDaZE9bWQKGE73vb8iFE2bk', -- Replace with your actual org_id
    'user_demo_kees',
    'admin',
    'Kees de Vries',
    '#F59E0B', -- Orange
    true
)
ON CONFLICT (id) DO NOTHING;

-- Verification query (uncomment to check seeding)
-- SELECT id, name, role, color, active FROM employees 
-- WHERE org_id = 'org_2oq5HDaZE9bWQKGE73vb8iFE2bk';