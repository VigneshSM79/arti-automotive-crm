-- ============================================================================
-- Fix: Allow Users to Take Over AI for Pool Lead Conversations
-- Created: December 19, 2025
-- Purpose: Non-admin users can't take over AI because RLS blocks updates
--          for conversations linked to pool leads (owner_id = NULL)
-- ============================================================================

-- PROBLEM:
-- Current RLS policy only allows updating conversations if user OWNS the lead.
-- But users are viewing conversations for POOL LEADS (owner_id = NULL) too.
-- When they click "Take Over from AI", the UPDATE fails because:
--   - Lead owner_id = NULL
--   - RLS checks: EXISTS (... AND leads.owner_id = auth.uid())
--   - NULL != auth.uid() → RLS denies UPDATE
--
-- SOLUTION:
-- Allow users to update conversations for:
--   1. Leads they own (owner_id = auth.uid())
--   2. Leads in the pool (owner_id IS NULL)  ← ADD THIS!

-- ============================================================================
-- STEP 1: Drop Existing Policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can update conversations for their leads" ON conversations;

-- ============================================================================
-- STEP 2: Create New Policy with Pool Lead Support
-- ============================================================================

CREATE POLICY "Users can update conversations for their leads or pool leads" ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND (
        leads.owner_id = auth.uid()  -- Own leads
        OR leads.owner_id IS NULL     -- Pool leads (NEW!)
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND (
        leads.owner_id = auth.uid()  -- Own leads
        OR leads.owner_id IS NULL     -- Pool leads (NEW!)
      )
    )
  );

COMMENT ON POLICY "Users can update conversations for their leads or pool leads" ON conversations IS
'Allows users to update conversations for leads they own OR leads in the pool (unclaimed). This enables non-admin users to take over AI control for pool conversations before claiming the lead.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that the policy exists:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'conversations'
-- AND policyname = 'Users can update conversations for their leads or pool leads';

-- Test as non-admin user (replace 'user-id' with actual non-admin user ID):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claims" TO '{"sub": "user-id"}';
--
-- -- This should now succeed (previously failed):
-- UPDATE conversations
-- SET ai_controlled = false
-- WHERE id IN (
--   SELECT c.id FROM conversations c
--   JOIN leads l ON l.id = c.lead_id
--   WHERE l.owner_id IS NULL  -- Pool lead
--   LIMIT 1
-- );

-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================

-- If you need to revert to the old policy:
--
-- DROP POLICY IF EXISTS "Users can update conversations for their leads or pool leads" ON conversations;
--
-- CREATE POLICY "Users can update conversations for their leads" ON conversations
--   FOR UPDATE
--   TO authenticated
--   USING (
--     public.has_role(auth.uid(), 'admin')
--     OR EXISTS (
--       SELECT 1 FROM leads
--       WHERE leads.id = conversations.lead_id
--       AND leads.owner_id = auth.uid()
--     )
--   )
--   WITH CHECK (
--     public.has_role(auth.uid(), 'admin')
--     OR EXISTS (
--       SELECT 1 FROM leads
--       WHERE leads.id = conversations.lead_id
--       AND leads.owner_id = auth.uid()
--     )
--   );
