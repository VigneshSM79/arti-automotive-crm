-- Fix Security Warning 1: Add search_path to update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix Security Warning 2: Enable RLS on users table and add policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles (needed for app functionality)
CREATE POLICY "Anyone can view user profiles"
ON public.users
FOR SELECT
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Only system can insert (via trigger)
CREATE POLICY "System can insert user profiles"
ON public.users
FOR INSERT
WITH CHECK (false);

-- Admins can manage all user profiles
CREATE POLICY "Admins can manage all profiles"
ON public.users
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));