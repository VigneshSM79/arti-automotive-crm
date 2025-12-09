-- ============================================================================
-- Migration: Add Manual AI Override Controls
-- Date: 2025-12-09
-- Purpose: Enable admins to manually take over conversations from AI
--          Addresses client feedback: "Manual override of the AI is a must"
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ADD AI CONTROL FIELDS TO CONVERSATIONS
-- ============================================================================

-- Master switch: Controls whether AI can respond to this conversation
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS ai_controlled BOOLEAN DEFAULT true;

COMMENT ON COLUMN conversations.ai_controlled IS
'Controls AI automation: true = AI active, false = manual control only.
When false, n8n workflows skip AI processing for this conversation.';

-- Audit trail: When did admin take over?
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS takeover_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN conversations.takeover_at IS
'Timestamp when admin manually took over from AI. NULL if never taken over.';

-- Audit trail: Which admin took over?
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS takeover_by UUID NULL REFERENCES users(id);

COMMENT ON COLUMN conversations.takeover_by IS
'User ID of admin who took over from AI. NULL if never taken over.';

-- ============================================================================
-- SECTION 2: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying AI-controlled vs manual conversations
CREATE INDEX IF NOT EXISTS idx_conversations_ai_controlled
ON conversations(ai_controlled)
WHERE ai_controlled = false;

COMMENT ON INDEX idx_conversations_ai_controlled IS
'Partial index for efficiently querying manually controlled conversations';

-- Index for audit queries (who took over when)
CREATE INDEX IF NOT EXISTS idx_conversations_takeover
ON conversations(takeover_by, takeover_at)
WHERE takeover_by IS NOT NULL;

COMMENT ON INDEX idx_conversations_takeover IS
'Index for audit queries: which admins took over which conversations';

-- ============================================================================
-- SECTION 3: UPDATE EXISTING CONVERSATIONS
-- ============================================================================

-- Set default for existing conversations: AI is active
UPDATE conversations
SET ai_controlled = true
WHERE ai_controlled IS NULL;

-- ============================================================================
-- SECTION 4: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  columns_added INTEGER;
  indexes_created INTEGER;
BEGIN
  -- Count new columns
  SELECT COUNT(*) INTO columns_added
  FROM information_schema.columns
  WHERE table_name = 'conversations'
  AND column_name IN ('ai_controlled', 'takeover_at', 'takeover_by');

  -- Count new indexes
  SELECT COUNT(*) INTO indexes_created
  FROM pg_indexes
  WHERE tablename = 'conversations'
  AND indexname IN ('idx_conversations_ai_controlled', 'idx_conversations_takeover');

  IF columns_added != 3 THEN
    RAISE EXCEPTION 'Migration failed: Expected 3 columns, found %', columns_added;
  END IF;

  IF indexes_created != 2 THEN
    RAISE EXCEPTION 'Migration failed: Expected 2 indexes, found %', indexes_created;
  END IF;

  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 Changes to conversations table:';
  RAISE NOTICE '   - ai_controlled (BOOLEAN) - Master AI switch';
  RAISE NOTICE '   - takeover_at (TIMESTAMPTZ) - When taken over';
  RAISE NOTICE '   - takeover_by (UUID) - Which admin took over';
  RAISE NOTICE '   - 2 indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 How this works:';
  RAISE NOTICE '   1. Admin clicks "Take Over from AI" button';
  RAISE NOTICE '   2. Sets ai_controlled = false, takeover_at = NOW(), takeover_by = admin_id';
  RAISE NOTICE '   3. n8n Workflow 2 checks ai_controlled field';
  RAISE NOTICE '   4. If false, AI skips processing - manual control only';
  RAISE NOTICE '   5. Admin can send manual messages via new Workflow 6';
END $$;

COMMIT;

-- ============================================================================
-- USAGE NOTES FOR FRONTEND
-- ============================================================================
--
-- Take Over from AI (Admin Action):
--
-- const { error } = await supabase
--   .from('conversations')
--   .update({
--     ai_controlled: false,
--     takeover_at: new Date().toISOString(),
--     takeover_by: currentUser.id
--   })
--   .eq('id', conversationId);
--
-- This will:
-- 1. Stop AI from responding to this conversation
-- 2. Enable manual message input field
-- 3. Create audit trail of who took over and when
--
-- n8n Workflow 2 should check:
-- - If ai_controlled = false, skip AI classification and response
-- - Only process conversations where ai_controlled = true
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK SCRIPT (FOR REFERENCE - DO NOT RUN)
-- ============================================================================
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_conversations_ai_controlled;
-- DROP INDEX IF EXISTS idx_conversations_takeover;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS ai_controlled;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS takeover_at;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS takeover_by;
-- COMMIT;
--
-- ============================================================================
