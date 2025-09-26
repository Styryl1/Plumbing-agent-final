-- Migration: Generalize wa_suggestions for multi-channel AI recommendations
-- Created: 2025-09-26

BEGIN;

-- Allow suggestions without a WhatsApp conversation/message (e.g. voice intakes)
ALTER TABLE public.wa_suggestions
  ALTER COLUMN conversation_id DROP NOT NULL,
  ALTER COLUMN message_id DROP NOT NULL;

-- Add intake_event reference for voice and other channels
ALTER TABLE public.wa_suggestions
  ADD COLUMN IF NOT EXISTS intake_event_id uuid REFERENCES public.intake_events(id) ON DELETE SET NULL;

-- Add channel classifier (default whatsapp) and summary text
ALTER TABLE public.wa_suggestions
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','voice','job_card')),
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- Backfill intake_event_id for existing WhatsApp suggestions via conversation linkage
UPDATE public.wa_suggestions AS s
SET intake_event_id = c.intake_event_id
FROM public.wa_conversations AS c
WHERE s.conversation_id = c.id
  AND s.intake_event_id IS NULL
  AND c.intake_event_id IS NOT NULL;

-- Ensure metadata JSON defaults to an empty object for easier querying
ALTER TABLE public.wa_suggestions
  ALTER COLUMN payload SET DEFAULT '{}'::jsonb;

UPDATE public.wa_suggestions
SET payload = '{}'::jsonb
WHERE payload IS NULL;

-- Index for quicker lookup by intake event
CREATE INDEX IF NOT EXISTS idx_wa_suggestions_intake
  ON public.wa_suggestions (intake_event_id, created_at DESC)
  WHERE intake_event_id IS NOT NULL;

-- Index for channel filtering
CREATE INDEX IF NOT EXISTS idx_wa_suggestions_channel
  ON public.wa_suggestions (channel, created_at DESC);

COMMENT ON COLUMN public.wa_suggestions.intake_event_id IS 'Optional link to intake_events for non-WhatsApp sources (voice, job card).';
COMMENT ON COLUMN public.wa_suggestions.channel IS 'Source channel of the AI recommendation (whatsapp, voice, job_card).';
COMMENT ON COLUMN public.wa_suggestions.summary IS 'Short human-readable summary of the recommendation.';
COMMENT ON COLUMN public.wa_suggestions.payload IS 'Structured JSON payload with AI metadata (actions, heuristics).';

COMMIT;
