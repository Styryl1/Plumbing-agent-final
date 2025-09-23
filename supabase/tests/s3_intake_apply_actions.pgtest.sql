BEGIN;

SELECT plan(5);

SET LOCAL role service_role;

-- Seed organization, customer, intake, job, and apply action
INSERT INTO organizations (id, name, owner_user_id)
VALUES ('org_apply', 'Apply Org', 'user_owner');

WITH inserted AS (
    INSERT INTO customers (org_id, name, phone, language)
    VALUES ('org_apply', 'Test Customer', '+31101234567', 'nl')
    RETURNING id
)
SELECT id INTO TEMP TABLE _customer_id FROM inserted;

WITH inserted AS (
    INSERT INTO intake_events (
        org_id,
        source,
        source_ref,
        channel,
        summary,
        details,
        received_at,
        priority
    ) VALUES (
        'org_apply',
        'whatsapp',
        'apply_case',
        'whatsapp',
        'Leaking radiator',
        '{"channel":"whatsapp","summary":"Leaking radiator","snippet":"Water on floor","lastMessageIso":"2025-09-22T08:00:00Z","media":[]}'::jsonb,
        '2025-09-22T08:00:00Z',
        'normal'
    ) RETURNING id
)
SELECT id INTO TEMP TABLE _intake_id FROM inserted;

WITH inserted AS (
    INSERT INTO unscheduled_items (
        org_id,
        intake_event_id,
        status,
        priority,
        metadata
    )
    SELECT 'org_apply', id, 'pending', 'normal', '{}'::jsonb FROM _intake_id
    RETURNING id
)
SELECT id INTO TEMP TABLE _unscheduled_id FROM inserted;

WITH inserted AS (
    INSERT INTO jobs (
        org_id,
        customer_id,
        title,
        status,
        priority,
        starts_at,
        ends_at
    )
    SELECT
        'org_apply',
        (SELECT id FROM _customer_id),
        'Replace valve',
        'scheduled',
        'normal',
        '2025-09-22T09:00:00Z',
        '2025-09-22T10:00:00Z'
    RETURNING id
)
SELECT id INTO TEMP TABLE _job_id FROM inserted;

INSERT INTO intake_apply_actions (
    org_id,
    intake_event_id,
    unscheduled_item_id,
    job_id,
    undo_token,
    expires_at,
    payload
) VALUES (
    'org_apply',
    (SELECT id FROM _intake_id),
    (SELECT id FROM _unscheduled_id),
    (SELECT id FROM _job_id),
    '11111111-1111-1111-1111-111111111111',
    '2025-09-22T11:00:00Z',
    '{}'::jsonb
);

RESET ROLE;

-- Authenticated user scoped to org_apply can read and update
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","org_id":"org_apply","sub":"user_apply"}';

SELECT is(
    (SELECT count(*) FROM intake_apply_actions),
    1,
    'Org apply can read its intake apply record'
);

SELECT lives_ok(
    $$
        UPDATE intake_apply_actions
        SET undone_at = now()
        WHERE org_id = 'org_apply'
          AND undo_token = '11111111-1111-1111-1111-111111111111'
    $$,
    'Org apply can mark apply action undone'
);

-- Switching to another org should hide the row and block updates
SET LOCAL request.jwt.claims = '{"role":"authenticated","org_id":"org_other","sub":"user_other"}';

SELECT is(
    (SELECT count(*) FROM intake_apply_actions),
    0,
    'Other org cannot view intake apply actions'
);

SELECT throws_ok(
    $$
        UPDATE intake_apply_actions
        SET undone_at = now()
        WHERE undo_token = '11111111-1111-1111-1111-111111111111'
    $$,
    '42501',
    'permission denied for table intake_apply_actions',
    'Other org cannot update intake apply actions'
);

SELECT throws_ok(
    $$
        DELETE FROM intake_apply_actions
        WHERE undo_token = '11111111-1111-1111-1111-111111111111'
    $$,
    '42501',
    'permission denied for table intake_apply_actions',
    'Other org cannot delete intake apply actions'
);

SELECT finish();
ROLLBACK;
