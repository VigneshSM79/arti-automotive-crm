-- ============================================
-- UPDATE RLS POLICIES: VIEW-ALL ACCESS MODEL
-- Created: December 18, 2025
-- Purpose: All users can VIEW all data
--          Admins can MODIFY/DELETE all data
--          Regular users can MODIFY/DELETE only their own data (based on owner_id)
-- ============================================

-- =====================
-- LEADS TABLE POLICIES
-- =====================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view leads based on role" ON leads;
DROP POLICY IF EXISTS "Users can insert leads based on role" ON leads;
DROP POLICY IF EXISTS "Users can update leads based on role" ON leads;
DROP POLICY IF EXISTS "Users can delete leads based on role" ON leads;

-- SELECT: All authenticated users can view all leads
CREATE POLICY "All users can view all leads" ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only admins can insert leads (CSV import is admin-only)
CREATE POLICY "Only admins can insert leads" ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- UPDATE: Admins OR users who own the lead (owner_id = auth.uid())
CREATE POLICY "Users can update their own leads" ON leads
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR owner_id = auth.uid()
  );

-- SPECIAL UPDATE: Users can claim leads from pool (owner_id NULL -> their user_id)
CREATE POLICY "Users can claim leads from pool" ON leads
  FOR UPDATE
  TO authenticated
  USING (
    owner_id IS NULL  -- Only unclaimed leads
  )
  WITH CHECK (
    owner_id = auth.uid()  -- Can only claim for themselves
  );

-- DELETE: Admins OR users who own the lead
CREATE POLICY "Users can delete their own leads" ON leads
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR owner_id = auth.uid()
  );

-- ===========================
-- CONVERSATIONS TABLE POLICIES
-- ===========================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations based on role" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations based on role" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations based on role" ON conversations;
DROP POLICY IF EXISTS "Users can delete conversations based on role" ON conversations;

-- SELECT: All authenticated users can view all conversations
CREATE POLICY "All users can view all conversations" ON conversations
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Admins OR users who own the related lead
CREATE POLICY "Users can insert conversations for their leads" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

-- UPDATE: Admins OR users who own the related lead
CREATE POLICY "Users can update conversations for their leads" ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND leads.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

-- DELETE: Admins only
CREATE POLICY "Only admins can delete conversations" ON conversations
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- ========================
-- MESSAGES TABLE POLICIES
-- ========================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages based on role" ON messages;
DROP POLICY IF EXISTS "Users can insert messages based on role" ON messages;

-- SELECT: All authenticated users can view all messages
CREATE POLICY "All users can view all messages" ON messages
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Admins OR users who own the lead related to the conversation
CREATE POLICY "Users can insert messages for their leads" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM conversations c
      JOIN leads l ON l.id = c.lead_id
      WHERE c.id = messages.conversation_id
      AND l.owner_id = auth.uid()
    )
  );

-- UPDATE: Admins only (messages shouldn't be edited after sent)
CREATE POLICY "Only admins can update messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- DELETE: Admins only
CREATE POLICY "Only admins can delete messages" ON messages
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- ====================================
-- CAMPAIGN_ENROLLMENTS TABLE POLICIES
-- ====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view enrollments based on role" ON campaign_enrollments;
DROP POLICY IF EXISTS "Users can insert enrollments based on role" ON campaign_enrollments;
DROP POLICY IF EXISTS "Users can update enrollments based on role" ON campaign_enrollments;

-- SELECT: All authenticated users can view all enrollments
CREATE POLICY "All users can view all campaign enrollments" ON campaign_enrollments
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Admins OR users who own the related lead
CREATE POLICY "Users can insert enrollments for their leads" ON campaign_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = campaign_enrollments.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

-- UPDATE: Admins OR users who own the related lead
CREATE POLICY "Users can update enrollments for their leads" ON campaign_enrollments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = campaign_enrollments.lead_id
      AND leads.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = campaign_enrollments.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

-- DELETE: Admins OR users who own the related lead
CREATE POLICY "Users can delete enrollments for their leads" ON campaign_enrollments
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = campaign_enrollments.lead_id
      AND leads.owner_id = auth.uid()
    )
  );

-- ==================================
-- MESSAGE_TEMPLATES TABLE POLICIES
-- ==================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view templates based on role" ON message_templates;
DROP POLICY IF EXISTS "Users can insert templates based on role" ON message_templates;
DROP POLICY IF EXISTS "Users can update templates based on role" ON message_templates;
DROP POLICY IF EXISTS "Users can delete templates based on role" ON message_templates;

-- SELECT: All authenticated users can view all templates
CREATE POLICY "All users can view all message templates" ON message_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Admins OR users creating their own templates
CREATE POLICY "Users can insert their own message templates" ON message_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

-- UPDATE: Admins OR users updating their own templates
CREATE POLICY "Users can update their own message templates" ON message_templates
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

-- DELETE: Admins OR users deleting their own templates
CREATE POLICY "Users can delete their own message templates" ON message_templates
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

-- ===========================
-- TAG CAMPAIGNS (VERIFY)
-- Already updated today, but ensure consistency
-- ===========================

-- Note: These policies were already updated in migration 20251218000000_allow_view_all_tag_campaigns.sql
-- Policies should already be:
-- - SELECT: All users (USING true)
-- - INSERT/UPDATE/DELETE: Only admins

-- ===================================
-- TAG CAMPAIGN MESSAGES (VERIFY)
-- Already updated today, ensure consistency
-- ===================================

-- Note: These policies were already updated in migration 20251218000000_allow_view_all_tag_campaigns.sql
-- Policies should already be:
-- - SELECT: All users (USING true)
-- - INSERT/UPDATE/DELETE: Only admins

-- ===========================
-- PIPELINE_STAGES (VERIFY)
-- Should remain public read
-- ===========================

-- Note: Pipeline stages should remain publicly readable (no changes needed)
-- Existing policy: "Anyone can view pipeline stages" FOR SELECT USING (true)

-- ===========================
-- MESSAGE_QUEUE TABLE
-- ===========================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view message queue" ON message_queue;

-- SELECT: All authenticated users can view message queue (for transparency)
-- Note: This is a backend processing table, but we allow viewing for consistency
CREATE POLICY "All users can view message queue" ON message_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Service role only (backend operations)
-- Keep existing "Service role full access" policy for backend operations

-- ===========================
-- USERS TABLE (if exists)
-- ===========================

-- Check if users table has RLS enabled and needs policies
DO $$
BEGIN
  -- Only add policies if users table exists and has RLS enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'users'
  ) THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view all users" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;

    -- SELECT: All authenticated users can view all users (for team visibility)
    EXECUTE 'CREATE POLICY "All users can view all users" ON users
      FOR SELECT
      TO authenticated
      USING (true)';

    -- UPDATE: Users can update their own profile, admins can update anyone
    EXECUTE 'CREATE POLICY "Users can update their own profile" ON users
      FOR UPDATE
      TO authenticated
      USING (
        public.has_role(auth.uid(), ''admin'')
        OR id = auth.uid()
      )
      WITH CHECK (
        public.has_role(auth.uid(), ''admin'')
        OR id = auth.uid()
      )';
  END IF;
END $$;

-- ============================================
-- VERIFICATION AND SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICIES UPDATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'ACCESS CONTROL MODEL:';
  RAISE NOTICE '  ✓ SELECT (View): ALL authenticated users see ALL data';
  RAISE NOTICE '  ✓ INSERT/UPDATE/DELETE: Admins = everything, Users = only their owned records';
  RAISE NOTICE '  ✓ Lead claiming: Users can claim from pool (owner_id NULL → their user_id)';
  RAISE NOTICE '  ✓ CSV import: Admin-only (INSERT on leads restricted)';
  RAISE NOTICE '';
  RAISE NOTICE 'OWNERSHIP MODEL:';
  RAISE NOTICE '  • Leads: Owned by owner_id (who claimed the lead)';
  RAISE NOTICE '  • Conversations: Linked to lead ownership';
  RAISE NOTICE '  • Messages: Linked to conversation/lead ownership';
  RAISE NOTICE '  • Campaign Enrollments: Linked to lead ownership';
  RAISE NOTICE '  • Message Templates: Owned by user_id (who created the template)';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATED TABLES:';
  RAISE NOTICE '  • leads';
  RAISE NOTICE '  • conversations';
  RAISE NOTICE '  • messages';
  RAISE NOTICE '  • campaign_enrollments';
  RAISE NOTICE '  • message_templates';
  RAISE NOTICE '  • message_queue';
  RAISE NOTICE '  • users (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'ALREADY UPDATED (Today - Dec 18):';
  RAISE NOTICE '  • tag_campaigns (all users view, admins modify)';
  RAISE NOTICE '  • tag_campaign_messages (all users view, admins modify)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Display current policies for verification
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN 'View'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Modify'
    WHEN cmd = 'DELETE' THEN 'Delete'
    ELSE cmd
  END as operation,
  CASE
    WHEN policyname LIKE '%admin%' THEN '🔴 Admin Only'
    WHEN policyname LIKE '%all users%' OR policyname LIKE '%All users%' THEN '🟢 All Users'
    WHEN policyname LIKE '%own%' OR policyname LIKE '%their%' THEN '🟡 Own Records'
    ELSE '⚪ Other'
  END as access_level
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'leads',
    'conversations',
    'messages',
    'campaign_enrollments',
    'message_templates',
    'tag_campaigns',
    'tag_campaign_messages',
    'message_queue',
    'users'
  )
ORDER BY
  tablename,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END,
  policyname;
