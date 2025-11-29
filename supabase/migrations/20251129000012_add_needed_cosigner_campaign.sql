-- Migration: Add "Needed a Cosigner" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 3, 5, 7)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Needed_Cosigner', 'Needed a Cosigner', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'If you''re still considering a cosigner, I can re-run the joint approval.'
    ),
    (
      campaign_uuid,
      3,
      2,
      'Lenders are being more flexible on cosigned apps right now. Want me to try again?'
    ),
    (
      campaign_uuid,
      5,
      3,
      'I can try to get you approved with or without a cosigner. Want me to look at both options?'
    ),
    (
      campaign_uuid,
      7,
      4,
      'Before I close your file, should I try one last approval with the updated programs?'
    );

  RAISE NOTICE 'Created campaign: Needed a Cosigner (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Needed a Cosigner'
ORDER BY tcm.sequence_order;
