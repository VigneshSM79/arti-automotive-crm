-- ============================================================================
-- Migration: Use messages.created_at as Source of Truth for Conversation Ordering
-- Date: 2025-12-09
-- Purpose: Remove dependency on conversations.last_message_at (denormalized field)
--          and use messages.created_at directly for correct, real-time ordering
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ADD PERFORMANCE INDEX
-- ============================================================================
-- Purpose: Fast lookups for latest message per conversation

-- Index for efficient MAX(created_at) queries grouped by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC);

COMMENT ON INDEX idx_messages_conversation_created IS
'Optimizes queries for finding latest message per conversation';

-- ============================================================================
-- SECTION 2: CREATE CONVERSATION LIST VIEW
-- ============================================================================
-- Purpose: Single source of truth - conversation metadata + latest message time

-- Drop view if it exists (for re-runability)
DROP VIEW IF EXISTS conversation_list;

-- Create view that joins conversations with latest message timestamp
CREATE VIEW conversation_list AS
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
  -- Get the latest message timestamp from messages table (source of truth)
  COALESCE(MAX(m.created_at), c.created_at) as last_message_at
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id;

COMMENT ON VIEW conversation_list IS
'Conversation metadata with last_message_at computed from messages.created_at (source of truth)';

-- ============================================================================
-- SECTION 3: GRANT PERMISSIONS
-- ============================================================================
-- Purpose: Ensure authenticated users can query the view

-- Grant SELECT on view to authenticated users
GRANT SELECT ON conversation_list TO authenticated;

-- ============================================================================
-- SECTION 4: CREATE RLS POLICIES FOR VIEW
-- ============================================================================
-- Purpose: Same access control as conversations table

-- Enable RLS on the view
ALTER VIEW conversation_list SET (security_invoker = true);

-- Note: Views with security_invoker=true inherit RLS from underlying tables
-- So conversations table RLS policies automatically apply to this view

-- ============================================================================
-- SECTION 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  index_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  -- Check if index was created
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_messages_conversation_created'
  ) INTO index_exists;

  -- Check if view was created
  SELECT EXISTS (
    SELECT 1 FROM pg_views
    WHERE viewname = 'conversation_list'
  ) INTO view_exists;

  IF NOT index_exists THEN
    RAISE EXCEPTION 'Migration failed: Index idx_messages_conversation_created not created';
  END IF;

  IF NOT view_exists THEN
    RAISE EXCEPTION 'Migration failed: View conversation_list not created';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 Changes:';
  RAISE NOTICE '   - Index created: idx_messages_conversation_created';
  RAISE NOTICE '   - View created: conversation_list';
  RAISE NOTICE '   - Source of truth: messages.created_at (NOT conversations.last_message_at)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Real-time behavior:';
  RAISE NOTICE '   - New message inserted → conversation moves to top automatically';
  RAISE NOTICE '   - No triggers needed - view computes from messages directly';
  RAISE NOTICE '   - Frontend subscribes to messages + conversations tables';
END $$;

COMMIT;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- Frontend Query (Supabase JS):
-- const { data } = await supabase
--   .from('conversation_list')  // Query the VIEW instead of 'conversations'
--   .select(`
--     *,
--     leads (id, first_name, last_name, phone)
--   `)
--   .order('last_message_at', { ascending: false });
--
-- Real-time Subscriptions:
-- - Subscribe to 'messages' table INSERT events
-- - Subscribe to 'conversations' table UPDATE events
-- - When either fires, invalidate ['conversations'] query
-- - Re-fetch will get updated order from view automatically
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK SCRIPT (FOR REFERENCE - DO NOT RUN)
-- ============================================================================
--
-- BEGIN;
-- DROP VIEW IF EXISTS conversation_list;
-- DROP INDEX IF EXISTS idx_messages_conversation_created;
-- COMMIT;
--
-- ============================================================================
