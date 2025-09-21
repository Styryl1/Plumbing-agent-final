-- 20250921_s1_voice_unique.sql
-- Ensure one intake voice call per external provider call id

ALTER TABLE intake_voice_calls
	ADD CONSTRAINT intake_voice_calls_external_unique UNIQUE (external_call_id);

ALTER TABLE intake_voice_calls
	ADD CONSTRAINT intake_voice_calls_intake_unique UNIQUE (intake_event_id);
