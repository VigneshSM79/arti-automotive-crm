-- Migration: Fix Missing User Creation Trigger
-- Date: November 28, 2025
-- Purpose: Attach trigger to auth.users to auto-create user_roles on signup
--
-- Issue: handle_new_user() function exists but trigger was never created
-- Result: New signups appear in auth.users but not in user_roles table
--
-- This migration:
-- 1. Creates the missing trigger on auth.users
-- 2. Backfills existing users who don't have user_roles entries

-- ============================================================================
-- STEP 1: Create the trigger to auto-create user_roles on new signups
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Automatically creates public.users and user_roles entries when new user signs up';

-- ============================================================================
-- STEP 2: Backfill existing users who don't have user_roles entries
-- ============================================================================

-- First, create missing entries in public.users table
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Then, create missing entries in user_roles table (default role: 'user')
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT
  au.id,
  'user'::public.app_role,
  NOW()
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id AND ur.role = 'user'
WHERE ur.id IS NULL;

-- ============================================================================
-- VERIFICATION QUERY (Run this after migration to verify fix)
-- ============================================================================
--
-- Check that all auth.users have corresponding user_roles entries:
--
-- SELECT
--   (SELECT COUNT(*) FROM auth.users) as total_auth_users,
--   (SELECT COUNT(DISTINCT user_id) FROM public.user_roles) as users_with_roles,
--   (SELECT COUNT(*) FROM auth.users au
--    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id)
--   ) as users_missing_roles;
--
-- Expected result: users_missing_roles should be 0
