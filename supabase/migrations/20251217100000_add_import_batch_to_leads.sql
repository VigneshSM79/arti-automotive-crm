-- ============================================
-- ADD IMPORT_BATCH FIELD TO LEADS TABLE
-- Created: December 17, 2025
-- Purpose: Track which CSV batch a lead belongs to
-- ============================================

-- Add import_batch column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS import_batch TEXT NULL;

-- Add index for batch queries (filtering by batch name)
CREATE INDEX IF NOT EXISTS idx_leads_import_batch
  ON leads(import_batch)
  WHERE import_batch IS NOT NULL;

-- Add comment
COMMENT ON COLUMN leads.import_batch IS
  'CSV batch name for tracking bulk imports (e.g., "December 2024 Import")';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✓ import_batch column added to leads table';
  RAISE NOTICE '  - Nullable text field for CSV batch tracking';
  RAISE NOTICE '  - Indexed for fast batch filtering';
END $$;
