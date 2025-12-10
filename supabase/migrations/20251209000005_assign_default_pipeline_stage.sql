-- ============================================================================
-- Migration: Assign Default Pipeline Stage to Existing Leads
-- Date: 2025-12-09
-- Purpose: Set pipeline_stage_id for existing leads that have NULL value
--          so they appear in the Pipeline page
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ASSIGN DEFAULT STAGE TO NULL LEADS
-- ============================================================================

-- Get the default stage (is_default = true) or first stage by order
WITH default_stage AS (
  SELECT id FROM pipeline_stages
  WHERE is_default = true
  ORDER BY "order" ASC
  LIMIT 1
)
-- Update all leads with NULL pipeline_stage_id to the default stage
UPDATE leads
SET pipeline_stage_id = (SELECT id FROM default_stage)
WHERE pipeline_stage_id IS NULL;

-- ============================================================================
-- SECTION 2: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  updated_count INTEGER;
  default_stage_name VARCHAR;
BEGIN
  -- Count how many leads were updated
  SELECT COUNT(*) INTO updated_count
  FROM leads
  WHERE pipeline_stage_id IS NOT NULL;

  -- Get the default stage name
  SELECT name INTO default_stage_name
  FROM pipeline_stages
  WHERE is_default = true
  ORDER BY "order" ASC
  LIMIT 1;

  RAISE NOTICE '✅ Pipeline stage assignment complete!';
  RAISE NOTICE '📊 Total leads with assigned stages: %', updated_count;
  RAISE NOTICE '🏷️  Default stage: %', default_stage_name;
  RAISE NOTICE '';
  RAISE NOTICE '💡 All existing leads now visible in Pipeline page';
END $$;

COMMIT;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- After running this migration:
-- 1. All existing leads will appear in the default pipeline stage
-- 2. Pipeline page will display all leads properly
-- 3. New leads should automatically get assigned to default stage
--
-- Rollback (if needed):
-- UPDATE leads SET pipeline_stage_id = NULL WHERE pipeline_stage_id = (SELECT id FROM pipeline_stages WHERE is_default = true LIMIT 1);
-- ============================================================================
