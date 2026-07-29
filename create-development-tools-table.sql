-- Drop existing table if it exists (to ensure clean schema)
DROP TABLE IF EXISTS public.development_tools CASCADE;

-- Create development_tools table
CREATE TABLE public.development_tools (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text,
  toolName text NOT NULL,
  quantity numeric DEFAULT 1,
  unitCost numeric DEFAULT 0,
  totalCost numeric DEFAULT 0,
  receiptUrl text,
  currency text DEFAULT 'USD',
  "orgId" text NOT NULL,
  isDeleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.development_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own org development_tools" ON public.development_tools;
CREATE POLICY "Users can view own org development_tools" ON public.development_tools FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text AND isDeleted = false);

DROP POLICY IF EXISTS "Users can insert own org development_tools" ON public.development_tools;
CREATE POLICY "Users can insert own org development_tools" ON public.development_tools FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can update own org development_tools" ON public.development_tools;
CREATE POLICY "Users can update own org development_tools" ON public.development_tools FOR UPDATE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can delete own org development_tools" ON public.development_tools;
CREATE POLICY "Users can delete own org development_tools" ON public.development_tools FOR DELETE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Create indexes
CREATE INDEX idx_development_tools_org ON public.development_tools("orgId");
CREATE INDEX idx_development_tools_projectId ON public.development_tools("projectId");
