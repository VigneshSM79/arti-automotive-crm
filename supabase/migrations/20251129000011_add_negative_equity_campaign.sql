-- Migration: Add "Negative Equity / Trade-In Issue" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 2, 4, 6)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Negative_Equity', 'Negative Equity / Trade-In Issue', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'We have stronger programs for negative equity now. Want me to rework your trade numbers?'
    ),
    (
      campaign_uuid,
      2,
      2,
      'I might be able to reduce the amount rolling into the new loan. Want me to check?'
    ),
    (
      campaign_uuid,
      4,
      3,
      'I found a couple ways to soften the trade hit. Want to see what that looks like?'
    ),
    (
      campaign_uuid,
      6,
      4,
      'Last call before I close your file. Want me to see if your trade position improved?'
    );

  RAISE NOTICE 'Created campaign: Negative Equity / Trade-In Issue (ID: %)', campaign_uuid;
END $$;

-- Verify the campaign
SELECT
  tc.id,
  tc.tag,
  tc.name,
  tcm.sequence_order,
  tcm.day_number,
  tcm.message_template
FROM tag_campaigns tc
LEFT JOIN tag_campaign_messages tcm ON tc.id = tcm.campaign_id
WHERE tc.name = 'Negative Equity / Trade-In Issue'
ORDER BY tcm.sequence_order;
