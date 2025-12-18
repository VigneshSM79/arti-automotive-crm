-- ============================================
-- CHANGE user_roles FK FROM auth.users TO public.users
-- Created: December 18, 2025
-- Purpose: Move FK relationship to public schema for better query relationships
-- Rationale: Since public.users is synced with auth.users via trigger,
--            referencing public.users keeps all relationships in same schema
-- ============================================

-- ============================================
-- SECTION 1: PRE-FLIGHT CHECKS
-- ============================================

-- Verify that all user_roles.user_id values exist in public.users
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.user_roles ur
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = ur.user_id
  );

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned user_roles records with no matching public.users', orphaned_count;
  END IF;

  RAISE NOTICE '✓ Pre-flight check passed: All user_roles have matching public.users records';
END $$;

-- ============================================
-- SECTION 2: DROP OLD FK CONSTRAINT
-- ============================================

-- Drop the existing FK pointing to auth.users
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

DO $$
BEGIN
  RAISE NOTICE '✓ Dropped old FK constraint (auth.users)';
END $$;

-- ============================================
-- SECTION 3: ADD NEW FK CONSTRAINT
-- ============================================

-- Add new FK pointing to public.users
-- Uses same constraint name for consistency with code FK hint
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✓ Created new FK constraint (public.users)';
END $$;

-- ============================================
-- SECTION 4: VERIFY CHANGES
-- ============================================

-- Verify the new FK exists and points to correct table
DO $$
DECLARE
  fk_exists BOOLEAN;
  fk_target_oid OID;
  expected_oid OID;
BEGIN
  -- Get expected OID for public.users
  SELECT 'public.users'::regclass::oid INTO expected_oid;

  -- Check if FK exists and get target table OID
  SELECT confrelid INTO fk_target_oid
  FROM pg_constraint
  WHERE conname = 'user_roles_user_id_fkey'
    AND conrelid = 'public.user_roles'::regclass;

  IF fk_target_oid IS NULL THEN
    RAISE EXCEPTION 'FK constraint was not created successfully';
  END IF;

  -- Verify FK points to public.users (compare OIDs, not text)
  IF fk_target_oid != expected_oid THEN
    RAISE EXCEPTION 'FK points to wrong table (OID: %, expected: %)', fk_target_oid, expected_oid;
  END IF;

  RAISE NOTICE '✓ Verification passed: FK correctly points to public.users';
END $$;

-- ============================================
-- SECTION 5: SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✓ Migration completed successfully!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Changed: user_roles.user_id FK';
  RAISE NOTICE 'From:    auth.users(id)';
  RAISE NOTICE 'To:      public.users(id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  - All relationships now in public schema';
  RAISE NOTICE '  - Supabase FK auto-detection works';
  RAISE NOTICE '  - Simpler query relationships';
  RAISE NOTICE '====================================';
END $$;

-- Show final constraint details
SELECT
  conname AS constraint_name,
  conrelid::regclass AS from_table,
  confrelid::regclass AS to_table,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'user_roles_user_id_fkey';
