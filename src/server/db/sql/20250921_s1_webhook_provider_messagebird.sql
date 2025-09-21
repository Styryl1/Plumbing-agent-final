-- Allow MessageBird provider in webhook_events
ALTER TABLE webhook_events
	DROP CONSTRAINT IF EXISTS webhook_events_provider_check;

ALTER TABLE webhook_events
	ADD CONSTRAINT webhook_events_provider_check
	CHECK (provider IN ('moneybird', 'mollie', 'whatsapp', 'clerk', 'messagebird'));
