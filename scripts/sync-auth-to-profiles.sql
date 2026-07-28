-- ============================================================
-- ACRUX ERP: Auth-to-Profile Sync Migration & JWT Claim Fixes
-- Run this ONCE in the Supabase SQL Editor.
-- ============================================================

-- STEP 1: Ensure the email column exists and is NOT NULL only
-- after we have backfilled it. Make it nullable first so the
-- backfill can run cleanly.
ALTER TABLE public.user_profiles
  ALTER COLUMN "email" DROP NOT NULL;

-- STEP 2: Backfill ALL existing orphaned auth users.
-- For every row in auth.users that has NO matching user_profiles row,
-- insert one using auth.users metadata. This repairs the current state.
INSERT INTO public.user_profiles (
  id,
  email,
  "staffId",
  name,
  role,
  "isAdmin",
  "organizationName",
  department,
  "defaultCurrency",
  "createdAt",
  "updatedAt"
)
SELECT
  u.id,
  u.email,
  COALESCE((u.raw_user_meta_data->>'staffId'), SPLIT_PART(u.email, '@', 1)),
  COALESCE((u.raw_user_meta_data->>'name'), SPLIT_PART(u.email, '@', 1)),
  COALESCE((u.raw_user_meta_data->>'role'), 'user'),
  COALESCE((u.raw_user_meta_data->>'isAdmin')::boolean, false),
  COALESCE(
    (u.raw_user_meta_data->>'organizationName'),
    'acrux-it-solutions'
  ),
  COALESCE((u.raw_user_meta_data->>'department'), 'General'),
  'USD',
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Create the auto-sync trigger function.
-- This runs for EVERY future new user signup, preventing orphaned users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    "staffId",
    name,
    role,
    "isAdmin",
    "organizationName",
    department,
    "defaultCurrency"
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'staffId'), SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'name'), SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role'), 'user'),
    COALESCE((NEW.raw_user_meta_data->>'isAdmin')::boolean, false),
    COALESCE(
      (NEW.raw_user_meta_data->>'organizationName'),
      'acrux-it-solutions'
    ),
    COALESCE((NEW.raw_user_meta_data->>'department'), 'General'),
    'USD'
  )
  ON CONFLICT (id) DO UPDATE SET
    email              = EXCLUDED.email,
    "staffId"          = COALESCE(EXCLUDED."staffId",           public.user_profiles."staffId"),
    name               = COALESCE(EXCLUDED.name,                public.user_profiles.name),
    role               = COALESCE(EXCLUDED.role,                public.user_profiles.role),
    "isAdmin"          = COALESCE(EXCLUDED."isAdmin",           public.user_profiles."isAdmin"),
    "organizationName" = COALESCE(EXCLUDED."organizationName",  public.user_profiles."organizationName"),
    department         = COALESCE(EXCLUDED.department,          public.user_profiles.department),
    "updatedAt"        = NOW();

  RETURN NEW;
END;
$$;

-- STEP 4: Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Create a trigger function to copy claims into raw_app_meta_data.
-- Supabase only places raw_app_meta_data keys directly into the root level
-- of JWT claims. Without this trigger, auth.jwt() ->> 'organizationName' 
-- resolves to NULL for all users, breaking all RLS policies across all tables.
CREATE OR REPLACE FUNCTION public.sync_user_metadata_to_app_metadata()
RETURNS TRIGGER AS $$
DECLARE
  metadata jsonb;
  appdata jsonb;
  org_slug text;
BEGIN
  metadata := NEW.raw_user_meta_data;
  appdata := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);

  -- Copy organizationName
  IF metadata ? 'organizationName' THEN
    -- Ensure organizationName is normalized (slugified)
    org_slug := LOWER(REGEXP_REPLACE(metadata ->> 'organizationName', '[^a-zA-Z0-9]', '-', 'g'));
    org_slug := REGEXP_REPLACE(org_slug, '-+', '-', 'g');
    appdata := jsonb_set(appdata, '{organizationName}', to_jsonb(org_slug));
  END IF;
  
  -- Copy role
  IF metadata ? 'role' THEN
    appdata := jsonb_set(appdata, '{role}', metadata -> 'role');
  END IF;
  
  -- Copy isAdmin
  IF metadata ? 'isAdmin' THEN
    appdata := jsonb_set(appdata, '{isAdmin}', metadata -> 'isAdmin');
  ELSIF metadata ? 'role' THEN
    appdata := jsonb_set(appdata, '{isAdmin}', to_jsonb((metadata ->> 'role') IN ('admin', 'superadmin')));
  END IF;

  NEW.raw_app_meta_data := appdata;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach BEFORE insert or update on raw_user_meta_data
DROP TRIGGER IF EXISTS tr_sync_user_metadata_to_app_metadata ON auth.users;
CREATE TRIGGER tr_sync_user_metadata_to_app_metadata
  BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_metadata_to_app_metadata();

-- STEP 6: One-time backfill query to fix raw_app_meta_data for all existing users.
-- This immediately grants root JWT claims to currently logged-in sessions.
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'organizationName', LOWER(REGEXP_REPLACE(COALESCE(raw_user_meta_data ->> 'organizationName', 'acrux-it-solutions'), '[^a-zA-Z0-9]', '-', 'g')),
    'role', COALESCE(raw_user_meta_data ->> 'role', 'user'),
    'isAdmin', COALESCE((raw_user_meta_data ->> 'isAdmin')::boolean, (raw_user_meta_data ->> 'role') IN ('admin', 'superadmin'), false)
  );

-- STEP 7: Fix RLS policies on user_profiles
-- Drop all existing SELECT policies to start clean
DROP POLICY IF EXISTS "View own org profiles"          ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own org profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "anon_admin_check"               ON public.user_profiles;

-- Policy A: Anon (unauthenticated) users can check if ANY admin exists.
-- This is required by the auth page to decide whether to show the
-- "System Administration" setup button. Only exposes isAdmin=true rows.
CREATE POLICY "anon_admin_check"
  ON public.user_profiles
  FOR SELECT
  TO anon
  USING ("isAdmin" = true);

-- Policy B: Authenticated users see all members of their own organization.
-- Robustly matches against both JWT root claim and raw user metadata payload fallback.
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

-- STEP 8: Verify results
SELECT id, email, raw_user_meta_data, raw_app_meta_data FROM auth.users;
SELECT COUNT(*) AS total_profiles FROM public.user_profiles;

