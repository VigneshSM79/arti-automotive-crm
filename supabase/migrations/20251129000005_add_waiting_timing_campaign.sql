-- Migration: Add "Waiting / Timing Not Right" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 3, 5, 7)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Waiting_Timing_Not_Right', 'Waiting / Timing Not Right', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'You mentioned timing wasn''t right earlier. Just checking in to see if things have changed.'
    ),
    (
      campaign_uuid,
      3,
      2,
      'Inventory and rates shifted a bit, which sometimes makes the timing better. Want to see what''s available now?'
    ),
    (
      campaign_uuid,
      5,
      3,
      'If the right deal came up earlier than expected, would you want me to send it to you?'
    ),
    (
      campaign_uuid,
      7,
      4,
      'I can keep you updated only when something perfect shows up. Want me to set that up?'
    );

  RAISE NOTICE 'Created campaign: Waiting / Timing Not Right (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Waiting / Timing Not Right'
ORDER BY tcm.sequence_order;
