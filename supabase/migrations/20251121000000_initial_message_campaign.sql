-- Migration: Initial Message Campaign Setup
-- Created: 2025-11-21
-- Description: Creates the Initial_Message campaign with default 4-message sequence

-- Insert Initial_Message campaign (system-level, user_id = NULL)
INSERT INTO tag_campaigns (tag, name, user_id, is_active)
VALUES ('Initial_Message', 'Initial Outbound Message', NULL, true)
ON CONFLICT (tag) DO NOTHING
RETURNING id;

-- Get the campaign ID for message inserts
-- Note: This assumes the campaign was just created or already exists
DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Get the Initial_Message campaign ID
  SELECT id INTO campaign_uuid
  FROM tag_campaigns
  WHERE tag = 'Initial_Message'
  LIMIT 1;

  -- Only insert messages if none exist for this campaign
  IF NOT EXISTS (
    SELECT 1 FROM tag_campaign_messages WHERE campaign_id = campaign_uuid
  ) THEN
    -- Insert default 4-message sequence
    INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
    VALUES
      (
        campaign_uuid,
        1,
        1,
        'Hi {first_name}, thanks for your interest! We received your inquiry and would love to help. Do you have any questions about the vehicle you were looking at?'
      ),
      (
        campaign_uuid,
        3,
        2,
        'Hi {first_name}, just checking in! Did you have a chance to think about the vehicle? I''m here if you need any information.'
      ),
      (
        campaign_uuid,
        5,
        3,
        'Hi {first_name}, still here to help! Let me know if you''d like to schedule a test drive or discuss financing options.'
      ),
      (
        campaign_uuid,
        7,
        4,
        'Hi {first_name}, this will be my last message. If you''re still interested, feel free to reach out anytime. We''re here to help!'
      );
  END IF;
END $$;

-- Add comment to document the campaign
COMMENT ON TABLE tag_campaigns IS 'Stores SMS campaign templates. Initial_Message campaign (user_id = NULL) is system-level and powers the first outbound message sequence.';

-- Verify the campaign was created
SELECT
  tc.id,
  tc.tag,
  tc.name,
  tc.user_id,
  COUNT(tcm.id) as message_count
FROM tag_campaigns tc
LEFT JOIN tag_campaign_messages tcm ON tc.id = tcm.campaign_id
WHERE tc.tag = 'Initial_Message'
GROUP BY tc.id, tc.tag, tc.name, tc.user_id;
