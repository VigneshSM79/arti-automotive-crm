-- Migration: Add "Didn't Like the Approved Vehicle" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 3, 5, 7)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Didnt_Like_Approved_Vehicle', 'Didn''t Like the Approved Vehicle', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'New options came in that might fit your style better. Want to see them?'
    ),
    (
      campaign_uuid,
      3,
      2,
      'If I can find something closer to what you expected, should I send choices?'
    ),
    (
      campaign_uuid,
      5,
      3,
      'We now have more vehicles approved for similar credit profiles. Want me to check?'
    ),
    (
      campaign_uuid,
      7,
      4,
      'Want me to keep you updated only when better matches come in?'
    );

  RAISE NOTICE 'Created campaign: Didn''t Like the Approved Vehicle (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Didn''t Like the Approved Vehicle'
ORDER BY tcm.sequence_order;
