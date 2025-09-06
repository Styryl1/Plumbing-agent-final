-- 022_wa_indexes_views.sql  
-- Purpose: Performance indexes and last message view for WhatsApp S1 API
-- Date: 2025-09-05

-- Add optimized indexes for conversation and message queries
CREATE INDEX IF NOT EXISTS idx_wa_conversations_org_last ON wa_conversations(org_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_convo_time ON wa_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wa_messages_org_time ON wa_messages(org_id, created_at);

-- Create view for efficient conversation listing with last message snippet
CREATE OR REPLACE VIEW vw_wa_conversation_last AS
SELECT
  c.id AS conversation_id,
  c.org_id,
  c.wa_contact_id,
  c.phone_number,
  c.status,
  c.last_message_at,
  m.message_type AS last_message_type,
  LEFT(COALESCE(m.content, ''), 140) AS last_message_snippet
FROM wa_conversations c
JOIN LATERAL (
  SELECT message_type, content
  FROM wa_messages
  WHERE wa_messages.conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true;

-- Ensure status column has proper default values (backfill)
UPDATE wa_conversations SET status = COALESCE(status, 'active') WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON VIEW vw_wa_conversation_last IS 'Optimized view for conversation listing with last message snippets';