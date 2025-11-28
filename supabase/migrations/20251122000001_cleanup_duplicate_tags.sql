-- Migration: Clean Up Duplicate Tags in Leads Table
-- Date: November 22, 2025
-- Purpose: Remove duplicate tags from leads.tags array column
--
-- Context: Due to frontend not checking for duplicates, some leads have
-- duplicate tags like ['Initial_Message', 'Initial_Message', 'Payment_Too_High']
-- This migration deduplicates all tag arrays.

-- ============================================================================
-- BACKUP: View leads with duplicate tags (for verification)
-- ============================================================================
-- Run this BEFORE the migration to see which leads will be affected:
--
-- SELECT
--   id,
--   first_name,
--   last_name,
--   tags as original_tags,
--   array_length(tags, 1) as total_tags,
--   array_length(ARRAY(SELECT DISTINCT unnest(tags)), 1) as unique_tags,
--   array_length(tags, 1) - array_length(ARRAY(SELECT DISTINCT unnest(tags)), 1) as duplicates_count
-- FROM leads
-- WHERE tags IS NOT NULL
--   AND array_length(tags, 1) > array_length(ARRAY(SELECT DISTINCT unnest(tags)), 1)
-- ORDER BY duplicates_count DESC;

-- ============================================================================
-- CLEANUP: Remove duplicate tags from all leads
-- ============================================================================
-- This updates the tags column to contain only unique values
-- Example: ['Initial_Message', 'Initial_Message', 'Payment_Too_High']
--       → ['Initial_Message', 'Payment_Too_High']

UPDATE leads
SET tags = ARRAY(SELECT DISTINCT unnest(tags))
WHERE tags IS NOT NULL
  AND array_length(tags, 1) > 1  -- Only update if there are multiple tags
  AND array_length(tags, 1) > array_length(ARRAY(SELECT DISTINCT unnest(tags)), 1);  -- Only if duplicates exist

-- ============================================================================
-- VERIFICATION: Check if any duplicates remain
-- ============================================================================
-- Run this AFTER the migration to verify cleanup succeeded:
--
-- SELECT
--   id,
--   first_name,
--   last_name,
--   tags,
--   array_length(tags, 1) as total_tags,
--   array_length(ARRAY(SELECT DISTINCT unnest(tags)), 1) as unique_tags
-- FROM leads
-- WHERE tags IS NOT NULL
--   AND array_length(tags, 1) > array_length(ARRAY(SELECT DISTINCT unnest(tags)), 1);
--
-- Expected result: 0 rows (no duplicates)

-- ============================================================================
-- STATISTICS: View tag cleanup summary
-- ============================================================================
-- Run this to see how many leads were affected:
--
-- SELECT
--   COUNT(*) as total_leads_with_tags,
--   COUNT(CASE WHEN array_length(tags, 1) > 1 THEN 1 END) as leads_with_multiple_tags,
--   SUM(array_length(tags, 1)) as total_tag_instances,
--   SUM(array_length(ARRAY(SELECT DISTINCT unnest(tags)), 1)) as total_unique_tags
-- FROM leads
-- WHERE tags IS NOT NULL;
