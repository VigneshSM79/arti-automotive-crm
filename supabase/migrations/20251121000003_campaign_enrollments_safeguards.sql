-- Migration: Add Safeguards to campaign_enrollments Table
-- Date: November 21, 2025
-- Purpose: Prevent duplicate enrollments and improve query performance

-- ============================================================================
-- SAFEGUARD 1: Prevent Duplicate Active Enrollments
-- ============================================================================
-- Ensures a lead cannot be enrolled in the same campaign twice with status='active'
-- Allows: Same lead in different campaigns (Initial_Message + Payment_Too_High)
-- Allows: Re-enrollment after completion (status changes from 'active' to 'completed')

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_enrollment
ON campaign_enrollments (lead_id, campaign_id)
WHERE status = 'active';

COMMENT ON INDEX idx_unique_active_enrollment IS 'Prevents duplicate active enrollments: same lead cannot be in same campaign twice with status=active';

-- ============================================================================
-- SAFEGUARD 2: Performance Index for Workflow 5 (Daily Scheduler)
-- ============================================================================
-- Speeds up queries that find active enrollments for sending follow-up messages
-- Query: SELECT * FROM campaign_enrollments WHERE status = 'active' ORDER BY created_at

CREATE INDEX IF NOT EXISTS idx_active_enrollments
ON campaign_enrollments(status, created_at)
WHERE status = 'active';

COMMENT ON INDEX idx_active_enrollments IS 'Optimizes Workflow 5 queries for active campaign enrollments';

-- ============================================================================
-- SAFEGUARD 3: Performance Index for Idempotency Checks (Workflow 1)
-- ============================================================================
-- Speeds up checks for existing enrollments before sending initial message
-- Query: SELECT id FROM campaign_enrollments WHERE lead_id = ? AND campaign_id = ? AND status = 'active'

CREATE INDEX IF NOT EXISTS idx_enrollment_lookup
ON campaign_enrollments(lead_id, campaign_id, status);

COMMENT ON INDEX idx_enrollment_lookup IS 'Optimizes idempotency checks in Workflow 1 (prevents duplicate initial messages)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify safeguards are in place:

-- Check unique constraint exists:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'campaign_enrollments' AND indexname = 'idx_unique_active_enrollment';

-- Check performance indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'campaign_enrollments' AND indexname IN ('idx_active_enrollments', 'idx_enrollment_lookup');

-- Test duplicate prevention (should fail):
-- INSERT INTO campaign_enrollments (lead_id, campaign_id, status) VALUES ('test-id', 'test-campaign', 'active');
-- INSERT INTO campaign_enrollments (lead_id, campaign_id, status) VALUES ('test-id', 'test-campaign', 'active');
-- Expected: ERROR - duplicate key value violates unique constraint

-- ============================================================================
-- AUDIT QUERY (Optional - Run periodically to check for stale enrollments)
-- ============================================================================
-- Find enrollments that have been active for more than 30 days (may need cleanup)
-- SELECT
--   ce.id,
--   ce.lead_id,
--   l.first_name,
--   l.last_name,
--   tc.tag as campaign_tag,
--   ce.created_at,
--   ce.status,
--   NOW() - ce.created_at as days_active
-- FROM campaign_enrollments ce
-- JOIN leads l ON l.id = ce.lead_id
-- JOIN tag_campaigns tc ON tc.id = ce.campaign_id
-- WHERE ce.status = 'active'
--   AND ce.created_at < NOW() - INTERVAL '30 days'
-- ORDER BY ce.created_at ASC;
