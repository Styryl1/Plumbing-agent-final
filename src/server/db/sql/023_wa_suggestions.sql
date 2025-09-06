-- Migration: 023_wa_suggestions.sql
-- Purpose: AI suggestions table for WhatsApp message analysis (S2)
-- Date: 2025-01-09

-- WhatsApp AI Suggestions table
CREATE TABLE IF NOT EXISTS wa_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES organizations(id),
  conversation_id uuid NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES wa_messages(id) ON DELETE CASCADE,
  proposed_text text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  urgency text NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  time_estimate_min int,
  source text NOT NULL DEFAULT 'rule' CHECK (source IN ('rule', 'openai')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_wa_sugg_org_conv_created 
  ON wa_suggestions(org_id, conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_sugg_message_id 
  ON wa_suggestions(message_id);

-- Enable RLS (consistent with existing pattern)
ALTER TABLE wa_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policy (using existing pattern from other wa_ tables)
CREATE POLICY wa_suggestions_org ON wa_suggestions
  FOR ALL USING (org_id = (SELECT auth.jwt() -> 'user_metadata' ->> 'organizationId'));

-- Add documentation comments
COMMENT ON TABLE wa_suggestions IS 'AI-generated suggestions for WhatsApp message responses';
COMMENT ON COLUMN wa_suggestions.proposed_text IS 'AI-suggested response text in Dutch';
COMMENT ON COLUMN wa_suggestions.tags IS 'Classification tags like ["lekkage", "urgent", "foto_nodig"]';
COMMENT ON COLUMN wa_suggestions.urgency IS 'Business urgency level for triage';
COMMENT ON COLUMN wa_suggestions.confidence IS 'AI confidence score (0.0-1.0)';
COMMENT ON COLUMN wa_suggestions.time_estimate_min IS 'Estimated job duration in minutes';
COMMENT ON COLUMN wa_suggestions.source IS 'Analysis source: rule-based or OpenAI';