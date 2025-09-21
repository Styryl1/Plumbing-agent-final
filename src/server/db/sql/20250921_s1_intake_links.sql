-- 20250921_s1_intake_links.sql
-- Slice 1: link WhatsApp conversations/messages to intake events and optimise intake queries

ALTER TABLE wa_conversations
	ADD COLUMN IF NOT EXISTS intake_event_id uuid
		REFERENCES intake_events(id) ON DELETE SET NULL;

ALTER TABLE wa_messages
	ADD COLUMN IF NOT EXISTS intake_event_id uuid
		REFERENCES intake_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_conversations_intake
	ON wa_conversations(intake_event_id);

CREATE INDEX IF NOT EXISTS idx_wa_messages_intake
	ON wa_messages(intake_event_id);

CREATE INDEX IF NOT EXISTS idx_intake_events_org_channel_time
	ON intake_events(org_id, channel, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_unscheduled_items_intake_pending
	ON unscheduled_items(org_id, intake_event_id)
	WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS unscheduled_items_intake_unique
	ON unscheduled_items(org_id, intake_event_id)
	WHERE status IN ('pending', 'applied');
