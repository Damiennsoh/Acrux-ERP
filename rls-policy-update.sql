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

-- DROP OLD UPDATE AND DELETE POLICIES
DROP POLICY IF EXISTS "Users can update own or org profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON public.user_profiles;

-- NEW UPDATE POLICY: Allows admins to update ANYONE in their org
CREATE POLICY "Admins can update org profiles" 
ON public.user_profiles FOR UPDATE 
USING (
  -- Allow updating own profile
  auth.uid() = id 
  OR 
  -- OR allow if current user is admin of same organization
  (
    (auth.jwt() ->> 'isAdmin')::boolean = true AND
    "organizationName" = (auth.jwt() ->> 'organizationName')::text
  )
)
WITH CHECK (
  auth.uid() = id 
  OR 
  (
    (auth.jwt() ->> 'isAdmin')::boolean = true AND
    "organizationName" = (auth.jwt() ->> 'organizationName')::text
  )
);

-- NEW DELETE POLICY: Allows admins to delete ANYONE in their org (except themselves)
CREATE POLICY "Admins can delete org profiles" 
ON public.user_profiles FOR DELETE 
USING (
  (auth.jwt() ->> 'isAdmin')::boolean = true AND
  "organizationName" = (auth.jwt() ->> 'organizationName')::text AND
  auth.uid() != id -- Prevent self-deletion
);
