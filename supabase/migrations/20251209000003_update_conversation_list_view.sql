-- Migration: Update conversation_list VIEW to include AI control fields
-- Date: December 9, 2025
-- Purpose: Add ai_controlled, takeover_at, takeover_by to the VIEW so frontend can query them

-- Drop the existing VIEW
DROP VIEW IF EXISTS conversation_list;

-- Recreate VIEW with all fields including new AI control columns
CREATE VIEW conversation_list
WITH (security_invoker=true) AS
SELECT
  c.id,
  c.lead_id,
  c.status,
  c.requires_human_handoff,
  c.handoff_triggered_at,
  c.ai_message_count,
  c.unread_count,
  c.created_at,
  c.updated_at,
  c.ai_controlled,        -- NEW: Master AI switch
  c.takeover_at,          -- NEW: When admin took over
  c.takeover_by,          -- NEW: Which admin took over
  COALESCE(MAX(m.created_at), c.created_at) as last_message_at
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id, c.lead_id, c.status, c.requires_human_handoff,
         c.handoff_triggered_at, c.ai_message_count, c.unread_count,
         c.created_at, c.updated_at, c.ai_controlled, c.takeover_at, c.takeover_by;

-- Comment on VIEW
COMMENT ON VIEW conversation_list IS 'Conversations with computed last_message_at and AI control fields for manual override feature';
