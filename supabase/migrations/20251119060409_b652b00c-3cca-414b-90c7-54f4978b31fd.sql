-- Fix security warnings: Set search_path for functions to prevent SQL injection

-- Fix auto_enroll_in_tag_campaigns function
CREATE OR REPLACE FUNCTION auto_enroll_in_tag_campaigns()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Fix handle_tag_removal function
CREATE OR REPLACE FUNCTION handle_tag_removal()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaign_enrollments ce
  SET status = 'paused'
  FROM tag_campaigns tc
  WHERE ce.campaign_id = tc.id
    AND ce.lead_id = NEW.id
    AND ce.status = 'active'
    AND NOT (tc.tag = ANY(NEW.tags));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;