-- Migration: Add CASCADE DELETE for conversations when lead is deleted
-- Created: 2025-11-30
-- Purpose: Ensure conversations are automatically deleted when their parent lead is deleted

-- =================================================================
-- STEP 1: Check current foreign key constraint
-- =================================================================

-- View the existing constraint on conversations.lead_id
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'conversations'
  AND kcu.column_name = 'lead_id';

-- =================================================================
-- STEP 2: Drop existing foreign key constraint
-- =================================================================

-- Drop the existing constraint (we'll recreate it with CASCADE)
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_lead_id_fkey;

-- Also check for any other variation of the constraint name
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS fk_conversations_lead;

-- =================================================================
-- STEP 3: Add new foreign key constraint with CASCADE DELETE
-- =================================================================

-- Add foreign key constraint: conversations.lead_id → leads.id
-- ON DELETE CASCADE: When lead is deleted, delete all its conversations
-- ON UPDATE CASCADE: If lead.id changes, update conversation.lead_id
ALTER TABLE conversations
ADD CONSTRAINT conversations_lead_id_fkey
FOREIGN KEY (lead_id)
REFERENCES leads(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMENT ON CONSTRAINT conversations_lead_id_fkey ON conversations IS 'Links conversation to lead with CASCADE DELETE - when lead is deleted, conversation is automatically deleted';

-- =================================================================
-- VERIFICATION
-- =================================================================

-- Verify the new foreign key has CASCADE delete
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'conversations'
  AND kcu.column_name = 'lead_id';

-- Expected output:
-- constraint_name: conversations_lead_id_fkey
-- delete_rule: CASCADE (not NO ACTION or RESTRICT)
-- update_rule: CASCADE

-- =================================================================
-- TEST CASCADE DELETE
-- =================================================================

-- Test: Create a test lead and conversation, then delete the lead
-- The conversation should be automatically deleted

-- 1. Create test lead
-- INSERT INTO leads (first_name, last_name, phone, pipeline_stage_id)
-- VALUES ('Test', 'DeleteMe', '+15555555555', (SELECT id FROM pipeline_stages LIMIT 1))
-- RETURNING id;

-- 2. Create conversation for that lead (use the id from step 1)
-- INSERT INTO conversations (lead_id, requires_human_handoff)
-- VALUES ('<lead-id-from-step-1>', false);

-- 3. Delete the lead
-- DELETE FROM leads WHERE id = '<lead-id-from-step-1>';

-- 4. Check if conversation was automatically deleted
-- SELECT * FROM conversations WHERE lead_id = '<lead-id-from-step-1>';
-- Expected: 0 rows (conversation was CASCADE deleted)

-- =================================================================
-- SUCCESS MESSAGE
-- =================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully!';
  RAISE NOTICE '  - conversations.lead_id now has CASCADE DELETE';
  RAISE NOTICE '  - When a lead is deleted, its conversations are automatically deleted';
END $$;

-- =================================================================
-- ROLLBACK (If needed)
-- =================================================================

-- To undo this migration and restore without CASCADE:
--
-- ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_lead_id_fkey;
-- ALTER TABLE conversations
-- ADD CONSTRAINT conversations_lead_id_fkey
-- FOREIGN KEY (lead_id)
-- REFERENCES leads(id)
-- ON DELETE NO ACTION
-- ON UPDATE CASCADE;
