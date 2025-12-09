-- ============================================================================
-- Migration: Enable Real-Time Replication for Leads Table
-- Date: 2025-12-09
-- Purpose: Enable Supabase real-time subscriptions for leads table
--          so the leads view updates automatically without manual refresh
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ENABLE REAL-TIME REPLICATION
-- ============================================================================
-- Purpose: Configure leads table for real-time updates via Supabase subscriptions

-- Enable replica identity for leads table
-- This allows Supabase to track which rows changed
ALTER TABLE leads REPLICA IDENTITY FULL;

-- ============================================================================
-- SECTION 2: ADD TABLE TO SUPABASE PUBLICATION
-- ============================================================================
-- Purpose: Include leads table in the Supabase real-time publication

-- Add leads table to the real-time publication
-- This makes leads.UPDATE, INSERT, DELETE events available to subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- ============================================================================
-- SECTION 3: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Real-time replication enabled for leads table!';
  RAISE NOTICE '📡 Table added to real-time publication:';
  RAISE NOTICE '   - leads (for automatic table updates)';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 Users will now see updates in real-time:';
  RAISE NOTICE '   - New leads appear immediately after creation';
  RAISE NOTICE '   - Tag changes update without refresh';
  RAISE NOTICE '   - Status changes show instantly';
  RAISE NOTICE '   - Deletions remove rows in real-time';
END $$;

COMMIT;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- After running this migration:
-- 1. Real-time subscriptions in Leads.tsx will start working immediately
-- 2. No code changes required - the hook is already implemented (line 140-144)
-- 3. Test by:
--    a. Open Leads page in one browser tab
--    b. Create a new lead via CSV import or manual entry
--    c. Lead should appear in table without refresh
--    d. Update a lead's tags via SQL or another tab
--    e. Changes should reflect immediately
--
-- Rollback (if needed):
-- ALTER PUBLICATION supabase_realtime DROP TABLE leads;
-- ============================================================================
