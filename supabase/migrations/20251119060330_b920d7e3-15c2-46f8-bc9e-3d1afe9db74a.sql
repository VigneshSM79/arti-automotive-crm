-- Campaign Enrollment System Implementation
-- This migration creates the automated enrollment system for tag-based campaigns

-- Step 1: Backfill existing enrollments for leads with matching tags
INSERT INTO campaign_enrollments (lead_id, campaign_id, status, current_message_index, enrolled_at)
SELECT DISTINCT 
  l.id as lead_id,
  tc.id as campaign_id,
  'active' as status,
  0 as current_message_index,
  NOW() as enrolled_at
FROM leads l
CROSS JOIN UNNEST(l.tags) as lead_tag
JOIN tag_campaigns tc ON tc.tag = lead_tag
WHERE tc.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM campaign_enrollments ce 
    WHERE ce.lead_id = l.id AND ce.campaign_id = tc.id
  );

-- Step 2: Create auto-enrollment function
-- This function automatically enrolls leads when tags are added
CREATE OR REPLACE FUNCTION auto_enroll_in_tag_campaigns()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert enrollments for any new tags that match active campaigns
  -- Prevents duplicates and respects "no re-enrollment" rule
  INSERT INTO campaign_enrollments (lead_id, campaign_id, status, current_message_index)
  SELECT DISTINCT 
    NEW.id,
    tc.id,
    'active',
    0
  FROM tag_campaigns tc
  WHERE tc.tag = ANY(NEW.tags)
    AND tc.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM campaign_enrollments ce 
      WHERE ce.lead_id = NEW.id AND ce.campaign_id = tc.id
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger for auto-enrollment
-- Fires whenever a lead's tags are inserted or updated
CREATE TRIGGER trigger_auto_enroll_campaigns
AFTER INSERT OR UPDATE OF tags ON leads
FOR EACH ROW
WHEN (NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0)
EXECUTE FUNCTION auto_enroll_in_tag_campaigns();

-- Step 4: Create tag removal handler
-- Pauses enrollments when a tag is removed from a lead
CREATE OR REPLACE FUNCTION handle_tag_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark enrollments as paused if the tag was removed
  UPDATE campaign_enrollments ce
  SET status = 'paused'
  FROM tag_campaigns tc
  WHERE ce.campaign_id = tc.id
    AND ce.lead_id = NEW.id
    AND ce.status = 'active'
    AND NOT (tc.tag = ANY(NEW.tags));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger for tag removal
-- Fires after tags are updated to handle removals
CREATE TRIGGER trigger_handle_tag_removal
AFTER UPDATE OF tags ON leads
FOR EACH ROW
EXECUTE FUNCTION handle_tag_removal();