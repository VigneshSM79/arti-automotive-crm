-- Migration: Add "Missing Documents" Campaign
-- Created: 2025-11-29
-- Description: Creates campaign with 4-message sequence (Days 1, 2, 4, 6)

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Insert campaign
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Missing_Documents', 'Missing Documents', true)
  RETURNING id INTO campaign_uuid;

  -- Insert messages
  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (
      campaign_uuid,
      1,
      1,
      'If you have the documents now, I can reopen your approval. Want to try again?'
    ),
    (
      campaign_uuid,
      2,
      2,
      'I can walk you through the document list step by step so it''s easy.'
    ),
    (
      campaign_uuid,
      4,
      3,
      'If documents were the issue, I can simplify the process. Want me to send the list again?'
    ),
    (
      campaign_uuid,
      6,
      4,
      'Just checking in. Do you want help gathering the documents so we can continue?'
    );

  RAISE NOTICE 'Created campaign: Missing Documents (ID: %)', campaign_uuid;
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
WHERE tc.name = 'Missing Documents'
ORDER BY tcm.sequence_order;
