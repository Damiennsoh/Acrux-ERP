-- ONLINE-FIRST ARCHITECTURE - Remove IndexedDB dependency
-- Run this in Supabase SQL Editor

-- Ensure all required columns exist
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS "organizationName" text,
  ADD COLUMN IF NOT EXISTS "department" text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "isAdmin" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "staffId" text;

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own org profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users and admins can insert profiles" ON public.user_profiles;

-- NEW ONLINE-FIRST POLICIES
CREATE POLICY "View own org profiles" ON public.user_profiles FOR SELECT USING (
  "organizationName" = (auth.jwt() ->> 'organizationName')::text
);

CREATE POLICY "Insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
);

CREATE POLICY "Update own or org profiles" ON public.user_profiles FOR UPDATE USING (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
) WITH CHECK (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
);

CREATE POLICY "Delete org profiles" ON public.user_profiles FOR DELETE USING (
  (auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text
);
