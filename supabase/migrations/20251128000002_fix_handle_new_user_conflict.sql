-- Migration: Fix handle_new_user() to avoid conflict with existing trigger
-- Date: November 28, 2025
-- Purpose: Modify handle_new_user() to only create user_roles, not public.users
--
-- Context: User already has a trigger that creates public.users entries
-- This function should ONLY handle user_roles creation to avoid duplicate key errors

-- ============================================================================
-- UPDATE handle_new_user() function to only create user_roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create user_roles entry (not public.users, that's handled by another trigger)
  -- Check if user_roles entry already exists first
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (NEW.id, 'user'::public.app_role, NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates user_roles entry with default "user" role when new user signs up.
   Assumes public.users entry is created by another trigger.';

-- ============================================================================
-- VERIFICATION: Ensure existing trigger is working
-- ============================================================================
-- Run this to check if trigger exists:
--
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'auth' AND event_object_table = 'users';
--
-- Should show: on_auth_user_created trigger
