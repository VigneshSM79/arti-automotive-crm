-- PHASE 1: Cleanup Duplicate Phone Numbers
-- Run this in Supabase Dashboard -> SQL Editor

-- =================================================================
-- STEP 1: PREVIEW - See which records will be KEPT (oldest per phone)
-- =================================================================
SELECT DISTINCT ON (phone)
  id,
  phone,
  first_name,
  last_name,
  email,
  created_at,
  owner_id,
  status
FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
ORDER BY phone, created_at ASC;

-- Expected: 3 rows (one per unique phone, oldest created_at)
-- ACTION: Review these records - they will be KEPT

-- =================================================================
-- STEP 2: PREVIEW - See which records will be DELETED
-- =================================================================
SELECT *
FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
AND id NOT IN (
  SELECT DISTINCT ON (phone) id
  FROM leads
  WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
  ORDER BY phone, created_at ASC
)
ORDER BY phone, created_at;

-- Expected: 42 rows (14 duplicates per phone)
-- ACTION: Review these records - they will be DELETED

-- =================================================================
-- STEP 3: CREATE BACKUP TABLE (Safety measure)
-- =================================================================
CREATE TABLE IF NOT EXISTS leads_duplicates_backup AS
SELECT *
FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
AND id NOT IN (
  SELECT DISTINCT ON (phone) id
  FROM leads
  WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
  ORDER BY phone, created_at ASC
);

-- Verify backup count
SELECT COUNT(*) as backup_count FROM leads_duplicates_backup;
-- Expected: 42

-- =================================================================
-- STEP 4: DELETE DUPLICATES (Keep oldest record per phone)
-- =================================================================
-- ⚠️ WARNING: This will permanently delete 42 records
-- ⚠️ Make sure Step 3 backup completed successfully first!

DELETE FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
AND id NOT IN (
  SELECT DISTINCT ON (phone) id
  FROM leads
  WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
  ORDER BY phone, created_at ASC
);

-- Expected output: DELETE 42

-- =================================================================
-- STEP 5: VERIFY CLEANUP
-- =================================================================
-- Check no duplicates remain
SELECT phone, COUNT(*) as count
FROM leads
GROUP BY phone
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- Verify the 3 kept records
SELECT id, phone, first_name, last_name, created_at
FROM leads
WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')
ORDER BY phone;

-- Expected: 3 rows (one per unique phone)

-- =================================================================
-- ROLLBACK (Only if something went wrong!)
-- =================================================================
-- If you need to restore the deleted records:
--
-- INSERT INTO leads
-- SELECT * FROM leads_duplicates_backup;
--
-- Then drop backup table:
-- DROP TABLE leads_duplicates_backup;

-- =================================================================
-- SUCCESS CONFIRMATION
-- =================================================================
SELECT
  'Cleanup successful! Deleted 42 duplicates, kept 3 unique phone numbers.' as status,
  (SELECT COUNT(*) FROM leads_duplicates_backup) as backed_up_count,
  (SELECT COUNT(*) FROM leads WHERE phone IN ('+17785552345', '+16045551234', '+16043334444')) as remaining_count;

-- Expected:
-- backed_up_count: 42
-- remaining_count: 3
