-- Fix for the "View own org profiles" RLS policy
-- This fixes the issue where users were not loading in the dashboard.
-- Supabase places custom claims inside 'app_metadata', not at the root of the JWT.
-- The fallback 'user_metadata' must also be slugified to match the stored format.

DROP POLICY IF EXISTS "View own org profiles" ON public.user_profiles;

CREATE POLICY "View own org profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    "organizationName" = COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text,
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE((auth.jwt() -> 'user_metadata' ->> 'organizationName')::text, '[^a-zA-Z0-9]', '-', 'g'), '-+', '-', 'g'))
    )
    OR auth.uid() = id
  );
