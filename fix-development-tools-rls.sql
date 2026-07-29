-- Drop existing policies to start clean
DROP POLICY IF EXISTS "Users can view own org development_tools" ON public.development_tools;
DROP POLICY IF EXISTS "Users can insert own org development_tools" ON public.development_tools;
DROP POLICY IF EXISTS "Users can update own org development_tools" ON public.development_tools;
DROP POLICY IF EXISTS "Users can delete own org development_tools" ON public.development_tools;

-- SELECT: Allow viewing if orgId matches user's organizationName from JWT
CREATE POLICY "Users can view own org development_tools" 
ON public.development_tools FOR SELECT 
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- INSERT: Allow inserting if orgId matches user's organizationName from JWT
CREATE POLICY "Users can insert own org development_tools" 
ON public.development_tools FOR INSERT 
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- UPDATE: Allow updating if orgId matches user's organizationName from JWT
CREATE POLICY "Users can update own org development_tools" 
ON public.development_tools FOR UPDATE 
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- DELETE: Allow deleting if orgId matches user's organizationName from JWT
CREATE POLICY "Users can delete own org development_tools" 
ON public.development_tools FOR DELETE 
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);
