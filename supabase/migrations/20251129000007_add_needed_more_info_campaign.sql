-- Migration: Add "Needed More Info / Confusion About Terms" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 2, 4, 6)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Needed_More_Info', 'Needed More Info / Confusion About Terms', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'I can break everything down simply. Which part do you want clarity on first?'
    ),
    (
      campaign_uuid,
      2,
      2,
      'I can send you a clean breakdown of payment, rate, warranty and all costs if you''d like.'
    ),
    (
      campaign_uuid,
      4,
      3,
      'Most people are surprised how simple the numbers look once I outline everything. Want me to send the summary?'
    ),
    (
      campaign_uuid,
      6,
      4,
      'Just checking in. Want a clear all-in breakdown before I close this file?'
    );

  RAISE NOTICE 'Created campaign: Needed More Info / Confusion About Terms (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Needed More Info / Confusion About Terms'
ORDER BY tcm.sequence_order;
