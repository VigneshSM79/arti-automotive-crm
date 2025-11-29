-- Migration: Add "Bought Elsewhere" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 3, 10, 30) - Special timing

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Bought_Elsewhere', 'Bought Elsewhere', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'Congrats on the purchase! Anything I could improve for next time?'
    ),
    (
      campaign_uuid,
      3,
      2,
      'If the rate was higher than you wanted, I can check refinancing options anytime.'
    ),
    (
      campaign_uuid,
      10,
      3,
      'Whenever you''re thinking upgrade or second vehicle, I''m always here to help.'
    ),
    (
      campaign_uuid,
      30,
      4,
      'Hope the vehicle is treating you well. If anything changes, just message me anytime.'
    );

  RAISE NOTICE 'Created campaign: Bought Elsewhere (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Bought Elsewhere'
ORDER BY tcm.sequence_order;
