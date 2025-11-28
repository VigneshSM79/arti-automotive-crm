-- Migration: Fix RLS Policies for tag_campaign_messages
-- Created: 2025-11-21
-- Description: Add INSERT, UPDATE, DELETE policies for tag_campaign_messages to allow managing system campaigns

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert tag campaign messages" ON tag_campaign_messages;
DROP POLICY IF EXISTS "Users can update tag campaign messages" ON tag_campaign_messages;
DROP POLICY IF EXISTS "Users can delete tag campaign messages" ON tag_campaign_messages;

-- Allow INSERT for:
-- 1. Messages belonging to user's own campaigns (user_id = auth.uid())
-- 2. Messages belonging to system campaigns (user_id IS NULL) - ADMINS ONLY
-- 3. Admins can manage all messages
CREATE POLICY "Users can insert tag campaign messages"
ON tag_campaign_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tag_campaigns
    WHERE tag_campaigns.id = tag_campaign_messages.campaign_id
    AND (
      (tag_campaigns.user_id IS NULL AND public.has_role(auth.uid(), 'admin'))  -- System campaigns = admin only
      OR tag_campaigns.user_id = auth.uid()  -- User's own campaigns
      OR public.has_role(auth.uid(), 'admin')  -- Admins can manage all
    )
  )
);

-- Allow UPDATE for:
-- 1. Messages belonging to user's own campaigns
-- 2. Messages belonging to system campaigns - ADMINS ONLY
-- 3. Admins can update all messages
CREATE POLICY "Users can update tag campaign messages"
ON tag_campaign_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tag_campaigns
    WHERE tag_campaigns.id = tag_campaign_messages.campaign_id
    AND (
      (tag_campaigns.user_id IS NULL AND public.has_role(auth.uid(), 'admin'))  -- System campaigns = admin only
      OR tag_campaigns.user_id = auth.uid()  -- User's own campaigns
      OR public.has_role(auth.uid(), 'admin')  -- Admins can manage all
    )
  )
);

-- Allow DELETE for:
-- 1. Messages belonging to user's own campaigns
-- 2. Messages belonging to system campaigns - ADMINS ONLY
-- 3. Admins can delete all messages
CREATE POLICY "Users can delete tag campaign messages"
ON tag_campaign_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tag_campaigns
    WHERE tag_campaigns.id = tag_campaign_messages.campaign_id
    AND (
      (tag_campaigns.user_id IS NULL AND public.has_role(auth.uid(), 'admin'))  -- System campaigns = admin only
      OR tag_campaigns.user_id = auth.uid()  -- User's own campaigns
      OR public.has_role(auth.uid(), 'admin')  -- Admins can manage all
    )
  )
);

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'tag_campaign_messages'
ORDER BY policyname;
