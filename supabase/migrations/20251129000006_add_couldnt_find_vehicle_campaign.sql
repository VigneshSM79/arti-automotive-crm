-- Migration: Add "Couldn't Find the Right Vehicle" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 2, 4, 6)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Couldnt_Find_Right_Vehicle', 'Couldn''t Find the Right Vehicle', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'New inventory just arrived that fits what you originally wanted. Want me to send options?'
    ),
    (
      campaign_uuid,
      2,
      2,
      'I think I found a couple vehicles that match your wishlist more closely. Want to see them?'
    ),
    (
      campaign_uuid,
      4,
      3,
      'I can search manually for you every morning if you want. What''s the one non-negotiable feature?'
    ),
    (
      campaign_uuid,
      6,
      4,
      'Before I close your file, want me to send the newest arrivals that might be a fit?'
    );

  RAISE NOTICE 'Created campaign: Couldn''t Find the Right Vehicle (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Couldn''t Find the Right Vehicle'
ORDER BY tcm.sequence_order;
