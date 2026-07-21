-- Update INSERT policy to allow admins to create users in their organization
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users and admins can insert profiles" 
ON public.user_profiles FOR INSERT 
WITH CHECK (
  auth.uid() = id OR 
  (
    (auth.jwt() ->> 'isAdmin')::boolean = true AND
    "organizationName" = (auth.jwt() ->> 'organizationName')::text
  )
);
