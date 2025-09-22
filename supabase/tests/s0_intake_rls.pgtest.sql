BEGIN;

SELECT plan(7);

SET LOCAL role service_role;

CREATE TEMP TABLE _intake_ids(name text PRIMARY KEY, id uuid);
CREATE TEMP TABLE _unscheduled_ids(name text PRIMARY KEY, id uuid);

WITH inserted AS (
	INSERT INTO intake_events (
		org_id,
		source,
		source_ref,
		channel,
		summary,
		details
	) VALUES (
		'org_a',
		'whatsapp',
		'wa_contact_a',
		'whatsapp',
		'Leiding lekt',
		'{"channel":"whatsapp","summary":"Leiding lekt","snippet":"Water op vloer","lastMessageIso":"2025-09-21T08:00:00Z","media":[]}'::jsonb
	) RETURNING id
)
INSERT INTO _intake_ids(name, id)
SELECT 'org_a', id FROM inserted;

WITH inserted AS (
	INSERT INTO intake_events (
		org_id,
		source,
		source_ref,
		channel,
		summary,
		details
	) VALUES (
		'org_b',
		'voice',
		'voice_call_b',
		'voice',
		'Stooring ketel',
		'{"channel":"voice","summary":"Stooring ketel","snippet":"Geen warm water","lastMessageIso":"2025-09-21T09:00:00Z","media":[],"voice":{"callId":"voice_call_b"}}'::jsonb
	) RETURNING id
)
INSERT INTO _intake_ids(name, id)
SELECT 'org_b', id FROM inserted;

INSERT INTO unscheduled_items (org_id, intake_event_id, status, priority, metadata)
SELECT 'org_a', id, 'pending', 'normal', '{}'::jsonb FROM _intake_ids WHERE name = 'org_a'
RETURNING id INTO TEMP TABLE _tmp_uns_a;

INSERT INTO _unscheduled_ids(name, id)
SELECT 'org_a', id FROM _tmp_uns_a;
DROP TABLE _tmp_uns_a;

INSERT INTO unscheduled_items (org_id, intake_event_id, status, priority, metadata)
SELECT 'org_b', id, 'pending', 'normal', '{}'::jsonb FROM _intake_ids WHERE name = 'org_b'
RETURNING id INTO TEMP TABLE _tmp_uns_b;

INSERT INTO _unscheduled_ids(name, id)
SELECT 'org_b', id FROM _tmp_uns_b;
DROP TABLE _tmp_uns_b;

RESET ROLE;

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","org_id":"org_a","sub":"user_a"}';

SELECT is((SELECT count(*) FROM intake_events), 1, 'Org A sees only its intake events');
SELECT is((SELECT count(*) FROM unscheduled_items), 1, 'Org A sees only its unscheduled items');

SET LOCAL request.jwt.claims = '{"role":"authenticated","org_id":"org_b","sub":"user_b"}';

SELECT is((SELECT count(*) FROM intake_events), 1, 'Org B sees only its intake events');
SELECT is((SELECT count(*) FROM unscheduled_items), 1, 'Org B sees only its unscheduled items');

SELECT throws_ok(
	$$
		UPDATE intake_events
		SET summary = 'forbidden'
		WHERE id = (SELECT id FROM _intake_ids WHERE name = 'org_a')
	$$,
	'42501',
	'.*',
	'Org B cannot update Org A intake'
);

SELECT throws_ok(
	$$
		INSERT INTO unscheduled_items (id, org_id, intake_event_id, status, priority, metadata)
		VALUES (gen_random_uuid(), 'org_b', (SELECT id FROM _intake_ids WHERE name = 'org_a'), 'pending', 'normal', '{}'::jsonb)
	$$,
	'42501',
	'.*',
	'Cannot insert unscheduled for different org'
);

SET LOCAL request.jwt.claims = '{"role":"authenticated","org_id":"org_a","sub":"user_a"}';

SELECT lives_ok(
	$$
		UPDATE unscheduled_items
		SET status = 'applied'
		WHERE id = (SELECT id FROM _unscheduled_ids WHERE name = 'org_a')
	$$,
	'Org A can update its own unscheduled item'
);

SELECT finish();
ROLLBACK;
