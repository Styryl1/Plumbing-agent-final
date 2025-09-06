-- Migration: 020_whatsapp_foundation.sql
-- Purpose: WhatsApp two-number model foundation with AI readiness
-- Date: 2025-01-09

-- Extend organizations for two-number model
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_business_number varchar(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_control_number varchar(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_settings jsonb DEFAULT '{}';

-- WhatsApp Conversations
CREATE TABLE IF NOT EXISTS wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES organizations(id),
  customer_id uuid REFERENCES customers(id),
  wa_contact_id varchar(50) NOT NULL,
  phone_number varchar(20) NOT NULL,
  last_message_at timestamptz NOT NULL,
  session_expires_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'closed')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, wa_contact_id)
);

-- WhatsApp Messages  
CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES organizations(id),
  conversation_id uuid NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  wa_message_id varchar(100) UNIQUE NOT NULL,
  direction varchar(10) NOT NULL CHECK (direction IN ('in', 'out')),
  message_type varchar(20) NOT NULL,
  content text,
  media_url text,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Analysis Runs (ready for S2)
CREATE TABLE IF NOT EXISTS ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES organizations(id),
  conversation_id uuid REFERENCES wa_conversations(id),
  customer_id uuid REFERENCES customers(id),
  job_id uuid REFERENCES jobs(id),
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  model varchar(50) NOT NULL,
  latency_ms integer NOT NULL,
  cost_cents integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook Event Deduplication (note: existing table, skip creation)
-- Using the existing webhook_events table structure

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wa_conversations_org_last ON wa_conversations(org_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_org_conv ON wa_messages(org_id, conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_runs_org ON ai_runs(org_id, created_at DESC);

-- Enable RLS
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using existing pattern from customers table)
-- The JWT structure from Clerk contains organizationId in user_metadata
CREATE POLICY wa_conversations_org ON wa_conversations
  FOR ALL USING (org_id = (SELECT auth.jwt() -> 'user_metadata' ->> 'organizationId'));

CREATE POLICY wa_messages_org ON wa_messages
  FOR ALL USING (org_id = (SELECT auth.jwt() -> 'user_metadata' ->> 'organizationId'));

CREATE POLICY ai_runs_org ON ai_runs
  FOR ALL USING (org_id = (SELECT auth.jwt() -> 'user_metadata' ->> 'organizationId'));

-- Add comments for documentation
COMMENT ON TABLE wa_conversations IS 'WhatsApp conversation threads with customers';
COMMENT ON TABLE wa_messages IS 'Individual WhatsApp messages with idempotent storage';
COMMENT ON TABLE ai_runs IS 'AI analysis runs for diagnosis, time estimation, and quote generation';
COMMENT ON TABLE webhook_events IS 'Deduplication tracking for webhook events from various providers';

COMMENT ON COLUMN wa_conversations.wa_contact_id IS 'WhatsApp contact ID (phone number without + prefix)';
COMMENT ON COLUMN wa_conversations.session_expires_at IS '24-hour session window for template-free messaging';
COMMENT ON COLUMN wa_messages.wa_message_id IS 'Unique WhatsApp message ID for idempotency';
COMMENT ON COLUMN wa_messages.payload_json IS 'Complete webhook payload for audit and replay';