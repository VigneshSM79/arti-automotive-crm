-- Migration: Add "Process Took Too Long" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 3, 5, 7)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Process_Took_Too_Long', 'Process Took Too Long', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'Good news. The approval process is much faster now. Want me to reopen your file?'
    ),
    (
      campaign_uuid,
      3,
      2,
      'We fixed the delays from last time. I can get you results way quicker now.'
    ),
    (
      campaign_uuid,
      5,
      3,
      'I can fast-track your file personally if timing was the issue. Want to restart?'
    ),
    (
      campaign_uuid,
      7,
      4,
      'I can submit your file immediately if you''re ready. Want me to go ahead?'
    );

  RAISE NOTICE 'Created campaign: Process Took Too Long (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Process Took Too Long'
ORDER BY tcm.sequence_order;
