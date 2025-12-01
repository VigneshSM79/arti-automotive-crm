-- Migration: Change leads.owner_id foreign key from auth.users to public.users
-- Created: 2025-11-30
-- Purpose: Fix foreign key to reference public.users instead of auth.users for proper relationship resolution

-- =================================================================
-- STEP 1: Check current foreign key constraint
-- =================================================================

-- View the existing constraint
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'leads'
  AND kcu.column_name = 'owner_id';

-- Expected: Shows foreign key pointing to auth.users

-- =================================================================
-- STEP 2: Drop existing foreign key constraint
-- =================================================================

-- Drop the existing constraint that points to auth.users
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS leads_owner_id_fkey;

-- Also drop any other variation of the constraint name
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS fk_leads_owner;

ALTER TABLE leads
DROP CONSTRAINT IF EXISTS leads_owner_fkey;

-- =================================================================
-- STEP 3: Verify data integrity before adding new constraint
-- =================================================================

-- Check if all owner_id values exist in public.users
-- This ensures we can safely add the new foreign key
DO $$
DECLARE
  orphaned_count INTEGER;
  orphaned_ids TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(DISTINCT l.owner_id::TEXT, ', ')
  INTO orphaned_count, orphaned_ids
  FROM leads l
  WHERE l.owner_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = l.owner_id
    );

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Data integrity error: Found % leads with owner_id not in public.users: %', orphaned_count, orphaned_ids;
  ELSE
    RAISE NOTICE 'Data integrity check passed: All owner_id values exist in public.users';
  END IF;
END $$;

-- =================================================================
-- STEP 4: Add new foreign key constraint to public.users
-- =================================================================

-- Add new foreign key constraint: leads.owner_id → public.users.id
-- ON DELETE SET NULL: If user is deleted, set owner_id to NULL (lead becomes unassigned)
-- ON UPDATE CASCADE: If user.id changes, update owner_id (unlikely but safe)
ALTER TABLE leads
ADD CONSTRAINT leads_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES public.users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

COMMENT ON CONSTRAINT leads_owner_id_fkey ON leads IS 'Links lead owner to public.users table (not auth.users) for proper Supabase relationship resolution';

-- =================================================================
-- STEP 5: Create index for performance (if not exists)
-- =================================================================

-- Index on owner_id for faster queries filtering by owner
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id)
WHERE owner_id IS NOT NULL;

COMMENT ON INDEX idx_leads_owner_id IS 'Performance index for queries filtering by lead owner';

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Verify the new foreign key points to public.users
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'leads'
  AND kcu.column_name = 'owner_id';

-- Expected output:
-- foreign_table_schema: public (not auth!)
-- foreign_table_name: users
-- delete_rule: SET NULL
-- update_rule: CASCADE

-- Test the relationship works in a query
SELECT
  l.id,
  l.first_name,
  l.last_name,
  l.owner_id,
  u.full_name AS owner_full_name,
  u.email AS owner_email
FROM leads l
LEFT JOIN public.users u ON l.owner_id = u.id
WHERE l.owner_id IS NOT NULL
LIMIT 5;

-- Expected: Should show leads with owner information from public.users

-- =================================================================
-- SUCCESS MESSAGE
-- =================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully!';
  RAISE NOTICE '  - Removed foreign key to auth.users';
  RAISE NOTICE '  - Added foreign key to public.users';
  RAISE NOTICE '  - Supabase can now resolve owner:users relationship';
END $$;

-- =================================================================
-- ROLLBACK (If needed)
-- =================================================================

-- To undo this migration and restore the old constraint:
--
-- ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_owner_id_fkey;
-- ALTER TABLE leads
-- ADD CONSTRAINT leads_owner_id_fkey
-- FOREIGN KEY (owner_id)
-- REFERENCES auth.users(id)
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;
