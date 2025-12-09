-- ============================================
-- SINGLE ACTIVE CAMPAIGN PER LEAD
-- Created: December 4, 2025
-- Purpose: Auto-complete old campaigns when new one starts
-- ============================================

-- Create trigger function
CREATE OR REPLACE FUNCTION ensure_single_active_campaign()
RETURNS TRIGGER AS $$
BEGIN
  -- When new enrollment is created with status='active'
  -- Complete all OTHER active enrollments for this lead
  IF NEW.status = 'active' THEN
    UPDATE campaign_enrollments
    SET
      status = 'completed',
      completed_at = NOW()
    WHERE lead_id = NEW.lead_id
      AND id != NEW.id  -- Don't affect the new enrollment
      AND status = 'active';

    RAISE NOTICE 'Auto-completed % old enrollments for lead %',
      (SELECT COUNT(*) FROM campaign_enrollments
       WHERE lead_id = NEW.lead_id AND id != NEW.id AND status = 'completed'),
      NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_new_enrollment ON campaign_enrollments;

-- Attach trigger to campaign_enrollments table
CREATE TRIGGER on_new_enrollment
  AFTER INSERT ON campaign_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_campaign();

-- Add comment
COMMENT ON FUNCTION ensure_single_active_campaign() IS
  'Ensures only one active campaign per lead. When new enrollment created, auto-completes all other active enrollments for that lead.';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- After running this migration, test with:
--
-- 1. Create first enrollment:
-- INSERT INTO campaign_enrollments (lead_id, campaign_id, status)
-- VALUES ('<lead-id>', '<campaign-1-id>', 'active');
--
-- 2. Create second enrollment (should auto-complete first):
-- INSERT INTO campaign_enrollments (lead_id, campaign_id, status)
-- VALUES ('<lead-id>', '<campaign-2-id>', 'active');
--
-- 3. Verify only one active:
-- SELECT lead_id, campaign_id, status, created_at, completed_at
-- FROM campaign_enrollments
-- WHERE lead_id = '<lead-id>'
-- ORDER BY created_at DESC;
--
-- Expected: First enrollment = 'completed', Second = 'active'
