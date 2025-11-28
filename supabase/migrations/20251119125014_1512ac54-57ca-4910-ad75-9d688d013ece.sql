-- Phase 1: Create Role Infrastructure

-- 1.1 Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 1.2 Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.3 Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 1.4 Add RLS policies to user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 2: Insert Admin Roles
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('24cdb519-d51e-44b5-8db8-4a27d7204ca5', 'admin'),
  ('bd6db1a8-bec8-4044-9bca-827f7dfb94f1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Phase 3: Update RLS Policies

-- 3.1 Conversations Table
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view conversations based on role"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
CREATE POLICY "Users can insert conversations based on role"
ON public.conversations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update conversations based on role"
ON public.conversations
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
CREATE POLICY "Users can delete conversations based on role"
ON public.conversations
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- 3.2 Messages Table
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages based on role"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
CREATE POLICY "Users can insert messages based on role"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 3.3 Leads Table
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
CREATE POLICY "Users can view leads based on role"
ON public.leads
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads;
CREATE POLICY "Users can insert leads based on role"
ON public.leads
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
CREATE POLICY "Users can update leads based on role"
ON public.leads
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;
CREATE POLICY "Users can delete leads based on role"
ON public.leads
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- 3.4 Campaign Enrollments Table
DROP POLICY IF EXISTS "Users can view enrollments for their leads" ON public.campaign_enrollments;
CREATE POLICY "Users can view enrollments based on role"
ON public.campaign_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_enrollments.lead_id
    AND leads.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can insert enrollments for their leads" ON public.campaign_enrollments;
CREATE POLICY "Users can insert enrollments based on role"
ON public.campaign_enrollments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_enrollments.lead_id
    AND leads.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can update enrollments for their leads" ON public.campaign_enrollments;
CREATE POLICY "Users can update enrollments based on role"
ON public.campaign_enrollments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_enrollments.lead_id
    AND leads.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 3.5 Message Templates Table
DROP POLICY IF EXISTS "Users can view their own templates" ON public.message_templates;
CREATE POLICY "Users can view templates based on role"
ON public.message_templates
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can insert their own templates" ON public.message_templates;
CREATE POLICY "Users can insert templates based on role"
ON public.message_templates
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can update their own templates" ON public.message_templates;
CREATE POLICY "Users can update templates based on role"
ON public.message_templates
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.message_templates;
CREATE POLICY "Users can delete templates based on role"
ON public.message_templates
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- 3.6 Tag Campaigns Table
DROP POLICY IF EXISTS "Anyone can view tag campaigns" ON public.tag_campaigns;
CREATE POLICY "Users can view tag campaigns based on role"
ON public.tag_campaigns
FOR SELECT
USING (
  user_id IS NULL 
  OR auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can insert their own tag campaigns" ON public.tag_campaigns;
CREATE POLICY "Users can insert tag campaigns based on role"
ON public.tag_campaigns
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can update their own tag campaigns" ON public.tag_campaigns;
CREATE POLICY "Users can update tag campaigns based on role"
ON public.tag_campaigns
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can delete their own tag campaigns" ON public.tag_campaigns;
CREATE POLICY "Users can delete tag campaigns based on role"
ON public.tag_campaigns
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Phase 4: Update handle_new_user() trigger and remove role column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Drop the role column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS role;