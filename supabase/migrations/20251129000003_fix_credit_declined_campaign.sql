-- Migration: Fix "Credit Declined Previously" Campaign
-- Created: 2025-11-29
-- Description: Updates campaign name and corrects message sequence

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Find the Credit Declined campaign (search by tag or name pattern)
  SELECT id INTO campaign_uuid
  FROM tag_campaigns
  WHERE tag ILIKE '%credit%' AND tag ILIKE '%decline%'
     OR name ILIKE '%credit%' AND name ILIKE '%decline%'
  LIMIT 1;

  -- If campaign exists, update it
  IF campaign_uuid IS NOT NULL THEN
    -- Update campaign name
    UPDATE tag_campaigns
    SET name = 'Credit Declined Previously',
        tag = 'Credit_Declined_Previously'
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
        'We have updated lenders for challenged credit. Want me to take another shot at approvals?'
      ),
      (
        campaign_uuid,
        2,
        2,
        'Some lenders are approving situations similar to yours from the last couple of weeks. Want me to check again?'
      ),
      (
        campaign_uuid,
        4,
        3,
        'I can try to get you approved without increasing your payment. Should I recheck it?'
      ),
      (
        campaign_uuid,
        6,
        4,
        'This is the best window we''ve had lately for approvals. Want me to run a fresh one before I close the file?'
      );

    RAISE NOTICE 'Updated campaign: Credit Declined Previously (ID: %)', campaign_uuid;
  ELSE
    RAISE NOTICE 'Credit Declined Previously campaign not found. Skipping update.';
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
WHERE tc.name = 'Credit Declined Previously'
ORDER BY tcm.sequence_order;
