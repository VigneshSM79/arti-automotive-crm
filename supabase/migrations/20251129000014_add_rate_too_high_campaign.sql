-- Migration: Add "Rate Too High" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 2, 4, 6)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Rate_Too_High', 'Rate Too High', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'Rates dropped with a few lenders. Want me to recheck yours?'
    ),
    (
      campaign_uuid,
      2,
      2,
      'I might be able to get you a better rate now. Want me to run the new numbers?'
    ),
    (
      campaign_uuid,
      4,
      3,
      'If rate was the only concern, I can try to bring it down. Should I take a look?'
    ),
    (
      campaign_uuid,
      6,
      4,
      'Want me to run one last check on the updated rates before I close this file?'
    );

  RAISE NOTICE 'Created campaign: Rate Too High (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Rate Too High'
ORDER BY tcm.sequence_order;
