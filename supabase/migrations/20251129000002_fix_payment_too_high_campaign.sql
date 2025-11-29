-- Migration: Fix "Payment Too High" Campaign
-- Created: 2025-11-29
-- Description: Updates campaign name and corrects message sequence

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Find the Payment Too High campaign (search by tag or name pattern)
  SELECT id INTO campaign_uuid
  FROM tag_campaigns
  WHERE tag ILIKE '%payment%' OR name ILIKE '%payment%'
  LIMIT 1;

  -- If campaign exists, update it
  IF campaign_uuid IS NOT NULL THEN
    -- Update campaign name
    UPDATE tag_campaigns
    SET name = 'Payment Too High',
        tag = 'Payment_Too_High'
    WHERE id = campaign_uuid;

    -- Delete existing messages
    DELETE FROM tag_campaign_messages
    WHERE campaign_id = campaign_uuid;

    -- Insert correct messages
    INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
    VALUES
      (
        campaign_uuid,
        1,
        1,
        'Good timing. Some payments on the vehicles you liked have come down. Want updated numbers?'
      ),
      (
        campaign_uuid,
        2,
        2,
        'I can structure things differently now. Sometimes a small adjustment solves the payment issue. Want me to show you?'
      ),
      (
        campaign_uuid,
        4,
        3,
        'If I could get you closer to your ideal monthly payment, would you want to reopen the conversation?'
      ),
      (
        campaign_uuid,
        6,
        4,
        'I don''t want you to miss a lower payment if it''s available. Should I run a new quote for you?'
      );

    RAISE NOTICE 'Updated campaign: Payment Too High (ID: %)', campaign_uuid;
  ELSE
    RAISE NOTICE 'Payment Too High campaign not found. Skipping update.';
  END IF;
END $$;

-- Verify the update
SELECT
  tc.id,
  tc.tag,
  tc.name,
  tcm.sequence_order,
  tcm.day_number,
  tcm.message_template
FROM tag_campaigns tc
LEFT JOIN tag_campaign_messages tcm ON tc.id = tcm.campaign_id
WHERE tc.name = 'Payment Too High'
ORDER BY tcm.sequence_order;
