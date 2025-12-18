-- ============================================================================
-- Fix: Allow Users to Send Messages for Pool Leads
-- Created: December 19, 2025
-- Purpose: Allow salespeople to send messages after taking over from AI,
--          even if there's a brief moment where the lead is still unclaimed
-- ============================================================================

-- PROBLEM:
-- When a salesperson takes over from AI, the frontend:
--   1. Updates conversation (ai_controlled = false)
--   2. Claims the lead (owner_id = user.id)
--   3. Refetches data
--   4. User types message and hits send
--
-- But there might be a race condition where the user tries to send a message
-- before the lead claim has propagated, so we allow messages for pool leads too.

-- SOLUTION:
-- Allow users to insert messages for:
--   1. Leads they own (owner_id = auth.uid())
--   2. Leads in the pool (owner_id IS NULL)  ← ADD THIS!

-- ============================================================================
-- STEP 1: Drop Existing Policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert messages for their leads" ON messages;

-- ============================================================================
-- STEP 2: Create New Policy with Pool Lead Support
-- ============================================================================

CREATE POLICY "Users can insert messages for their leads or pool leads" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM conversations c
      JOIN leads l ON l.id = c.lead_id
      WHERE c.id = messages.conversation_id
      AND (
        l.owner_id = auth.uid()  -- Own leads
        OR l.owner_id IS NULL     -- Pool leads (NEW!)
      )
    )
  );

COMMENT ON POLICY "Users can insert messages for their leads or pool leads" ON messages IS
'Allows users to insert messages for leads they own OR leads in the pool. This enables sending messages after taking over from AI, even during the brief moment before the lead claim propagates.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that the policy exists:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'messages'
-- AND policyname = 'Users can insert messages for their leads or pool leads';

-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================

-- If you need to revert to the old policy:
--
-- DROP POLICY IF EXISTS "Users can insert messages for their leads or pool leads" ON messages;
--
-- CREATE POLICY "Users can insert messages for their leads" ON messages
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     public.has_role(auth.uid(), 'admin')
--     OR EXISTS (
--       SELECT 1 FROM conversations c
--       JOIN leads l ON l.id = c.lead_id
--       WHERE c.id = messages.conversation_id
--       AND l.owner_id = auth.uid()
--     )
--   );
