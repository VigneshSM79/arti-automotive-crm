-- ============================================
-- ALLOW ALL USERS TO VIEW ALL TAG CAMPAIGNS
-- Created: December 18, 2025
-- Purpose: All users can VIEW all tag templates (read-only)
--          ONLY admins can CREATE/EDIT/DELETE templates
-- ============================================

-- Drop existing SELECT policy for tag_campaigns
DROP POLICY IF EXISTS "Anyone can view tag campaigns" ON tag_campaigns;

-- Create new policy: ALL users can view ALL campaigns
CREATE POLICY "All users can view all tag campaigns" ON tag_campaigns
  FOR SELECT USING (true);

-- UPDATE policy: ONLY admins can edit campaigns
DROP POLICY IF EXISTS "Users can update their own tag campaigns" ON tag_campaigns;
CREATE POLICY "Only admins can update tag campaigns" ON tag_campaigns
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- DELETE policy: ONLY admins can delete campaigns
DROP POLICY IF EXISTS "Users can delete their own tag campaigns" ON tag_campaigns;
CREATE POLICY "Only admins can delete tag campaigns" ON tag_campaigns
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- INSERT policy: ONLY admins can create campaigns
DROP POLICY IF EXISTS "Users can insert their own tag campaigns" ON tag_campaigns;
CREATE POLICY "Only admins can insert tag campaigns" ON tag_campaigns
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- UPDATE tag_campaign_messages POLICIES
-- ============================================

-- Drop existing SELECT policy for tag_campaign_messages
DROP POLICY IF EXISTS "Anyone can view tag campaign messages" ON tag_campaign_messages;

-- Create new policy: ALL users can view ALL messages
CREATE POLICY "All users can view all tag campaign messages" ON tag_campaign_messages
  FOR SELECT USING (true);

-- INSERT policy: ONLY admins can insert messages
DROP POLICY IF EXISTS "Users can insert tag campaign messages" ON tag_campaign_messages;
CREATE POLICY "Only admins can insert tag campaign messages"
ON tag_campaign_messages
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE policy: ONLY admins can update messages
DROP POLICY IF EXISTS "Users can update tag campaign messages" ON tag_campaign_messages;
CREATE POLICY "Only admins can update tag campaign messages"
ON tag_campaign_messages
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- DELETE policy: ONLY admins can delete messages
DROP POLICY IF EXISTS "Users can delete tag campaign messages" ON tag_campaign_messages;
CREATE POLICY "Only admins can delete tag campaign messages"
ON tag_campaign_messages
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- VERIFY POLICIES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✓ RLS policies updated successfully!';
  RAISE NOTICE '  - All users can VIEW all tag campaigns and messages (read-only)';
  RAISE NOTICE '  - ONLY admins can CREATE/EDIT/DELETE campaigns and messages';
END $$;

-- Show current policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('tag_campaigns', 'tag_campaign_messages')
ORDER BY tablename, cmd, policyname;
