-- Migration: Add "Wanted to Improve Credit First" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 3, 5, 7)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Improve_Credit_First', 'Wanted to Improve Credit First', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'Some lenders approve earlier in the rebuilding process. Want me to recheck your options?'
    ),
    (
      campaign_uuid,
      3,
      2,
      'I can look at credit-friendly programs for you. Chances are better right now.'
    ),
    (
      campaign_uuid,
      5,
      3,
      'If I can get you approved without hurting your credit score, should I try again?'
    ),
    (
      campaign_uuid,
      7,
      4,
      'I can rerun your file anytime with no pressure. Want me to try once more?'
    );

  RAISE NOTICE 'Created campaign: Wanted to Improve Credit First (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Wanted to Improve Credit First'
ORDER BY tcm.sequence_order;
