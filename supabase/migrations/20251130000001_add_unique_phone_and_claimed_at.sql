-- Migration: Add UNIQUE constraint on phone + claimed_at timestamp
-- Created: 2025-11-30
-- Purpose: Prevent duplicate contacts and track when leads are claimed

-- =================================================================
-- 1. Add claimed_at column (for tracking when leads are claimed)
-- =================================================================
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN leads.claimed_at IS 'Timestamp when lead was claimed by a sales agent from Lead Pool';

-- =================================================================
-- 2. Add UNIQUE constraint on phone column
-- =================================================================
-- This will prevent duplicate phone numbers from being inserted
-- Database will reject INSERT/UPDATE with error code 23505 if phone already exists
ALTER TABLE leads
ADD CONSTRAINT unique_phone_number UNIQUE (phone);

COMMENT ON CONSTRAINT unique_phone_number ON leads IS 'Prevents duplicate contacts with same phone number';

-- =================================================================
-- 3. Create index for performance on claimed_at queries
-- =================================================================
-- This helps with queries filtering by claimed_at (e.g., "show recently claimed leads")
CREATE INDEX IF NOT EXISTS idx_leads_claimed_at ON leads(claimed_at)
WHERE claimed_at IS NOT NULL;

COMMENT ON INDEX idx_leads_claimed_at IS 'Performance index for claimed leads queries';

-- =================================================================
-- VERIFICATION QUERIES (run after migration to confirm success)
-- =================================================================

-- Check UNIQUE constraint exists
SELECT
  conname as constraint_name,
  contype as constraint_type,
  CASE contype
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    ELSE 'OTHER'
  END as type_description
FROM pg_constraint
WHERE conrelid = 'leads'::regclass
AND conname = 'unique_phone_number';

-- Expected: 1 row with constraint_name='unique_phone_number', type='u'

-- Check claimed_at column exists
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name = 'claimed_at';

-- Expected: 1 row with data_type='timestamp with time zone'

-- Check index exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'leads'
AND indexname = 'idx_leads_claimed_at';

-- Expected: 1 row showing the index definition

-- =================================================================
-- TEST UNIQUE CONSTRAINT (optional - test duplicate rejection)
-- =================================================================
-- Uncomment to test that duplicates are properly rejected:
--
-- Get an existing phone number
-- SELECT phone FROM leads LIMIT 1;
--
-- Try to insert duplicate (should FAIL with error 23505)
-- INSERT INTO leads (phone, first_name, last_name, user_id)
-- VALUES ('<existing-phone>', 'Test', 'Duplicate', '00000000-0000-0000-0000-000000000000');
--
-- Expected error: duplicate key value violates unique constraint "unique_phone_number"
