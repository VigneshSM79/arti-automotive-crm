-- Migration: Add foreign key constraint for leads.owner_id → public.users.id
-- Created: 2025-11-30
-- Purpose: Enable Supabase to resolve owner:users relationship in queries

-- =================================================================
-- STEP 1: Check for orphaned records (leads with invalid owner_id)
-- =================================================================

-- This query shows any leads with owner_id that doesn't exist in public.users
-- Run this first to verify data integrity
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM leads l
  WHERE l.owner_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = l.owner_id
    );

  IF orphaned_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % leads with invalid owner_id. These will need to be fixed before adding constraint.', orphaned_count;
  ELSE
    RAISE NOTICE 'Data integrity check passed. No orphaned owner_id records found.';
  END IF;
END $$;

-- =================================================================
-- STEP 2: Add foreign key constraint
-- =================================================================

-- Add foreign key constraint: leads.owner_id → public.users.id
-- ON DELETE SET NULL: If user is deleted, set owner_id to NULL (lead becomes unassigned)
-- ON UPDATE CASCADE: If user.id changes, update owner_id (unlikely but safe)
ALTER TABLE leads
ADD CONSTRAINT leads_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES public.users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

COMMENT ON CONSTRAINT leads_owner_id_fkey ON leads IS 'Links lead owner to public.users table for agent/admin info';

-- =================================================================
-- STEP 3: Create index for performance
-- =================================================================

-- Index on owner_id for faster queries filtering by owner
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id)
WHERE owner_id IS NOT NULL;

COMMENT ON INDEX idx_leads_owner_id IS 'Performance index for queries filtering by lead owner';

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Verify foreign key was created
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
-- constraint_name: leads_owner_id_fkey
-- column_name: owner_id
-- foreign_table_schema: public
-- foreign_table_name: users
-- foreign_column_name: id
-- delete_rule: SET NULL
-- update_rule: CASCADE

-- Verify index was created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'leads'
  AND indexname = 'idx_leads_owner_id';

-- Expected: 1 row showing the index definition

-- =================================================================
-- TEST: Verify relationship works in query
-- =================================================================

-- Test the owner:users relationship that will be used in LeadPool.tsx
SELECT
  l.id,
  l.first_name,
  l.last_name,
  l.owner_id,
  u.full_name AS owner_name
FROM leads l
LEFT JOIN public.users u ON l.owner_id = u.id
LIMIT 5;

-- Expected: Should show leads with owner_name populated for claimed leads

-- =================================================================
-- ROLLBACK (If needed)
-- =================================================================

-- To undo this migration:
--
-- DROP INDEX IF EXISTS idx_leads_owner_id;
-- ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_owner_id_fkey;
