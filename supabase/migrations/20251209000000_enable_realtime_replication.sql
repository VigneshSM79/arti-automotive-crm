-- ============================================================================
-- Migration: Enable Real-Time Replication for Conversations and Messages
-- Date: 2025-12-09
-- Purpose: Enable Supabase real-time subscriptions for conversations and messages
--          so agents can see AI handoff indicators and new messages without refreshing
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ENABLE REAL-TIME REPLICATION
-- ============================================================================
-- Purpose: Configure tables for real-time updates via Supabase subscriptions

-- Enable replica identity for conversations table
-- This allows Supabase to track which rows changed
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Enable replica identity for messages table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- ============================================================================
-- SECTION 2: ADD TABLES TO SUPABASE PUBLICATION
-- ============================================================================
-- Purpose: Include tables in the Supabase real-time publication

-- Add conversations table to the real-time publication
-- This makes conversations.UPDATE, INSERT, DELETE events available to subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Add messages table to the real-time publication
-- This makes messages.INSERT, UPDATE, DELETE events available to subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================================
-- SECTION 3: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Real-time replication enabled successfully!';
  RAISE NOTICE '📡 Tables added to real-time publication:';
  RAISE NOTICE '   - conversations (for AI handoff indicators)';
  RAISE NOTICE '   - messages (for new message notifications)';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 Agents will now see updates in real-time:';
  RAISE NOTICE '   - AI handoff indicators appear immediately';
  RAISE NOTICE '   - New messages show without refresh';
  RAISE NOTICE '   - Conversation list updates automatically';
END $$;

COMMIT;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- After running this migration:
-- 1. Real-time subscriptions in the frontend will start working immediately
-- 2. No code changes required - the hooks are already implemented
-- 3. Test by:
--    a. Open Conversations page in browser
--    b. Update a conversation's requires_human_handoff field via SQL
--    c. Orange "Action Required" badge should appear without refresh
--
-- Rollback (if needed):
-- ALTER PUBLICATION supabase_realtime DROP TABLE conversations;
-- ALTER PUBLICATION supabase_realtime DROP TABLE messages;
-- ============================================================================
