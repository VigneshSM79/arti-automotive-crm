-- Migration: Fix "Ghosted / No Response" Campaign
-- Created: 2025-11-29
-- Description: Updates campaign name and corrects message sequence

DO $$
DECLARE
  campaign_uuid UUID;
BEGIN
  -- Find the Ghosted campaign (search by tag or name pattern)
  SELECT id INTO campaign_uuid
  FROM tag_campaigns
  WHERE tag ILIKE '%ghosted%' OR name ILIKE '%ghosted%'
  LIMIT 1;

  -- If campaign exists, update it
  IF campaign_uuid IS NOT NULL THEN
    -- Update campaign name
    UPDATE tag_campaigns
    SET name = 'Ghosted / No Response',
        tag = 'Ghosted'
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
        'Hey {first_name},, just checking in. Are you still exploring vehicle options or did plans change?'
      ),
      (
        campaign_uuid,
        2,
        2,
        'I''ve got a couple options that fit what you were originally looking for. Want me to send them over?'
      ),
      (
        campaign_uuid,
        4,
        3,
        'If the right payment and the right vehicle came up, would you be open to taking another look?'
      ),
      (
        campaign_uuid,
        6,
        4,
        'Before I close out your file, want me to keep sending options or pause it for now?'
      );

    RAISE NOTICE 'Updated campaign: Ghosted / No Response (ID: %)', campaign_uuid;
  ELSE
    RAISE NOTICE 'Ghosted campaign not found. Skipping update.';
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
WHERE tc.name = 'Ghosted / No Response'
ORDER BY tcm.sequence_order;
