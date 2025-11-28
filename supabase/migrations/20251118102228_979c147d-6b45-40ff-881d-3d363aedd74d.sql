-- Rename campaigns table to tag_campaigns
ALTER TABLE campaigns RENAME TO tag_campaigns;

-- Rename campaign_messages table to tag_campaign_messages
ALTER TABLE campaign_messages RENAME TO tag_campaign_messages;

-- Update foreign key name for tag_campaign_messages
ALTER TABLE tag_campaign_messages 
  DROP CONSTRAINT campaign_messages_campaign_id_fkey;

ALTER TABLE tag_campaign_messages
  ADD CONSTRAINT tag_campaign_messages_tag_campaign_id_fkey 
  FOREIGN KEY (campaign_id) REFERENCES tag_campaigns(id) ON DELETE CASCADE;

-- Update foreign key name for campaign_enrollments
ALTER TABLE campaign_enrollments
  DROP CONSTRAINT campaign_enrollments_campaign_id_fkey;

ALTER TABLE campaign_enrollments
  ADD CONSTRAINT campaign_enrollments_tag_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES tag_campaigns(id) ON DELETE CASCADE;

-- Drop old RLS policies for tag_campaigns
DROP POLICY IF EXISTS "Anyone can view campaigns" ON tag_campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON tag_campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON tag_campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON tag_campaigns;

-- Recreate RLS policies for tag_campaigns
CREATE POLICY "Anyone can view tag campaigns" ON tag_campaigns
  FOR SELECT USING ((user_id IS NULL) OR (auth.uid() = user_id));

CREATE POLICY "Users can delete their own tag campaigns" ON tag_campaigns
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tag campaigns" ON tag_campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tag campaigns" ON tag_campaigns
  FOR UPDATE USING (auth.uid() = user_id);

-- Drop old RLS policies for tag_campaign_messages
DROP POLICY IF EXISTS "Anyone can view campaign messages" ON tag_campaign_messages;

-- Recreate RLS policies for tag_campaign_messages
CREATE POLICY "Anyone can view tag campaign messages" ON tag_campaign_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tag_campaigns
      WHERE tag_campaigns.id = tag_campaign_messages.campaign_id
      AND ((tag_campaigns.user_id IS NULL) OR (tag_campaigns.user_id = auth.uid()))
    )
  );