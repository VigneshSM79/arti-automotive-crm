-- ============================================================================
-- Drop Tag Removal Trigger (Fix Campaign Enrollment Pausing Bug)
-- Created: December 18, 2025
-- Purpose: Remove handle_tag_removal trigger that incorrectly pauses enrollments
-- ============================================================================

-- CONTEXT:
-- The handle_tag_removal() trigger was causing a bug where campaign enrollments
-- were being paused immediately after creation (within 1 minute). This broke
-- Workflow 5 (scheduler) which only processes enrollments with status='active'.
--
-- ROOT CAUSE:
-- - trigger_handle_tag_removal fires on EVERY tag UPDATE
-- - Race condition or timing issue causes it to pause newly created enrollments
-- - The trigger logic checks if tag is NOT in array and pauses enrollment
--
-- SOLUTION:
-- Drop the trigger entirely because:
-- 1. Tag removal is rare in this system (AI and agents primarily ADD tags)
-- 2. Manual pausing can be done via UI if needed
-- 3. The trigger causes more harm than good
--
-- WHAT WE'RE KEEPING:
-- - trigger_auto_enroll_campaigns (auto-creates enrollments when tags added)
-- - auto_enroll_in_tag_campaigns() function
-- These are valuable for handling all 14 tag campaigns uniformly

-- ============================================================================
-- STEP 1: Drop the Problematic Trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_handle_tag_removal ON leads;

COMMENT ON TABLE leads IS 'Lead/contact table. Note: trigger_handle_tag_removal was removed on 2025-12-18 to fix enrollment pausing bug';

-- ============================================================================
-- STEP 2: Drop the Function
-- ============================================================================

DROP FUNCTION IF EXISTS handle_tag_removal();

-- ============================================================================
-- STEP 3: Fix Existing Paused Enrollments (Bug Victims)
-- ============================================================================

-- Reactivate enrollments that were paused by the bug
-- Criteria: paused within 5 minutes of creation + is_paused flag is false
UPDATE campaign_enrollments
SET
  status = 'active',
  updated_at = NOW()
WHERE status = 'paused'
  AND updated_at - created_at < INTERVAL '5 minutes'
  AND (is_paused = false OR is_paused IS NULL);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that trigger is gone:
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_handle_tag_removal';
-- Expected: 0 rows

-- Check that function is gone:
-- SELECT * FROM pg_proc WHERE proname = 'handle_tag_removal';
-- Expected: 0 rows

-- Check that auto-enrollment trigger still exists:
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_enroll_campaigns';
-- Expected: 1 row

-- Check updated enrollments:
-- SELECT
--   status,
--   COUNT(*) as count,
--   COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as recently_updated
-- FROM campaign_enrollments
-- GROUP BY status;

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================

-- After running this migration:
--
-- 1. Add a tag to a lead:
--    UPDATE leads SET tags = tags || '{Payment_Too_High}' WHERE id = '<test-lead-id>';
--
-- 2. Check that enrollment was created AND stays active:
--    SELECT * FROM campaign_enrollments WHERE lead_id = '<test-lead-id>' ORDER BY created_at DESC LIMIT 1;
--    Expected: status = 'active' (should NOT change to 'paused')
--
-- 3. Wait 2 minutes and check again:
--    Expected: status still = 'active'
--
-- 4. Verify Workflow 5 can now pick up the enrollment:
--    SELECT * FROM campaign_enrollments WHERE status = 'active' LIMIT 10;
--
-- ============================================================================
-- ROLLBACK (If needed - NOT RECOMMENDED)
-- ============================================================================

-- If you need to restore the trigger (not recommended):
--
-- CREATE OR REPLACE FUNCTION handle_tag_removal()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE campaign_enrollments ce
--   SET status = 'paused'
--   FROM tag_campaigns tc
--   WHERE ce.campaign_id = tc.id
--     AND ce.lead_id = NEW.id
--     AND ce.status = 'active'
--     AND NOT (tc.tag = ANY(NEW.tags));
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
--
-- CREATE TRIGGER trigger_handle_tag_removal
-- AFTER UPDATE OF tags ON leads
-- FOR EACH ROW
-- EXECUTE FUNCTION handle_tag_removal();
