-- Fix RLS Policies for all operational tables
-- This grants full CRUD access (SELECT, INSERT, UPDATE, DELETE) to users
-- for records that match their organization's slug in the JWT app_metadata.

-- 1. Projects
DROP POLICY IF EXISTS "Org members full access" ON public.projects;
CREATE POLICY "Org members full access" ON public.projects
  FOR ALL TO authenticated
  USING ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text)
  WITH CHECK ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text);

-- 2. Development Tools
DROP POLICY IF EXISTS "Org members full access" ON public.development_tools;
CREATE POLICY "Org members full access" ON public.development_tools
  FOR ALL TO authenticated
  USING ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text)
  WITH CHECK ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text);

-- 3. Broker Payments
DROP POLICY IF EXISTS "Org members full access" ON public.broker_payments;
CREATE POLICY "Org members full access" ON public.broker_payments
  FOR ALL TO authenticated
  USING ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text)
  WITH CHECK ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text);

-- 4. Miscellaneous
DROP POLICY IF EXISTS "Org members full access" ON public.miscellaneous;
CREATE POLICY "Org members full access" ON public.miscellaneous
  FOR ALL TO authenticated
  USING ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text)
  WITH CHECK ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text);

-- 5. Revenue
DROP POLICY IF EXISTS "Org members full access" ON public.revenue;
CREATE POLICY "Org members full access" ON public.revenue
  FOR ALL TO authenticated
  USING ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text)
  WITH CHECK ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text);

-- 6. Audit Logs
DROP POLICY IF EXISTS "Org members full access" ON public.audit_logs;
CREATE POLICY "Org members full access" ON public.audit_logs
  FOR ALL TO authenticated
  USING ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text)
  WITH CHECK ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text);

-- 7. Expenses
DROP POLICY IF EXISTS "Org members full access" ON public.expenses;
CREATE POLICY "Org members full access" ON public.expenses
  FOR ALL TO authenticated
  USING ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text)
  WITH CHECK ("orgId" = (auth.jwt() -> 'app_metadata' ->> 'organizationName')::text);
