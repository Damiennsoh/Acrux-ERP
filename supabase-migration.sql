-- Complete Supabase Migration Script for ACRUX ERP
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  staffId text UNIQUE,
  name text NOT NULL,
  role text DEFAULT 'user',
  isAdmin boolean DEFAULT false,
  organizationName text NOT NULL REFERENCES public.organizations(id),
  department text DEFAULT 'General',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text UNIQUE NOT NULL,
  name text NOT NULL,
  clientName text,
  location text,
  projectType text DEFAULT 'New',
  startDate timestamptz,
  endDate timestamptz,
  status text DEFAULT 'Active',
  documentUrl text,
  budget numeric DEFAULT 0,
  "orgId" text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create development_costs table
CREATE TABLE IF NOT EXISTS public.development_costs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  developer text,
  date timestamptz DEFAULT now(),
  "orgId" text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text NOT NULL,
  description text,
  amount numeric NOT NULL,
  category text,
  date timestamptz DEFAULT now(),
  "orgId" text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create revenue table
CREATE TABLE IF NOT EXISTS public.revenue (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text NOT NULL,
  description text,
  amount numeric NOT NULL,
  category text,
  date timestamptz DEFAULT now(),
  "orgId" text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create miscellaneous table
CREATE TABLE IF NOT EXISTS public.miscellaneous (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  type text DEFAULT 'expense',
  date timestamptz DEFAULT now(),
  "orgId" text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create broker_payments table
CREATE TABLE IF NOT EXISTS public.broker_payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text NOT NULL,
  brokerName text NOT NULL,
  amount numeric NOT NULL,
  commissionRate numeric,
  paymentDate timestamptz DEFAULT now(),
  "orgId" text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  userId uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entityType text,
  entityId text,
  changes jsonb,
  timestamp timestamptz DEFAULT now(),
  "orgId" text NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miscellaneous ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations RLS Policies
DROP POLICY IF EXISTS "Users can view own org" ON public.organizations;
CREATE POLICY "Users can view own org" ON public.organizations FOR SELECT
USING (id = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Admins can insert orgs" ON public.organizations;
CREATE POLICY "Admins can insert orgs" ON public.organizations FOR INSERT
WITH CHECK ((auth.jwt() ->> 'isAdmin')::boolean = true);

DROP POLICY IF EXISTS "Admins can update orgs" ON public.organizations;
CREATE POLICY "Admins can update orgs" ON public.organizations FOR UPDATE
USING ((auth.jwt() ->> 'isAdmin')::boolean = true);

-- User Profiles RLS Policies
DROP POLICY IF EXISTS "View own org profiles" ON public.user_profiles;
CREATE POLICY "View own org profiles" ON public.user_profiles FOR SELECT
USING ("organizationName" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Insert own profile" ON public.user_profiles;
CREATE POLICY "Insert own profile" ON public.user_profiles FOR INSERT
WITH CHECK (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
);

DROP POLICY IF EXISTS "Update own or org profiles" ON public.user_profiles;
CREATE POLICY "Update own or org profiles" ON public.user_profiles FOR UPDATE
USING (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
)
WITH CHECK (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
);

DROP POLICY IF EXISTS "Delete org profiles" ON public.user_profiles;
CREATE POLICY "Delete org profiles" ON public.user_profiles FOR DELETE
USING (
  (auth.jwt() ->> 'isAdmin')::boolean = true AND
  "organizationName" = (auth.jwt() ->> 'organizationName')::text
);

-- Projects RLS Policies
DROP POLICY IF EXISTS "Users can view own org projects" ON public.projects;
CREATE POLICY "Users can view own org projects" ON public.projects FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can insert own org projects" ON public.projects;
CREATE POLICY "Users can insert own org projects" ON public.projects FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can update own org projects" ON public.projects;
CREATE POLICY "Users can update own org projects" ON public.projects FOR UPDATE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can delete own org projects" ON public.projects;
CREATE POLICY "Users can delete own org projects" ON public.projects FOR DELETE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Development Costs RLS Policies
DROP POLICY IF EXISTS "Users can view own org development_costs" ON public.development_costs;
CREATE POLICY "Users can view own org development_costs" ON public.development_costs FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can insert own org development_costs" ON public.development_costs;
CREATE POLICY "Users can insert own org development_costs" ON public.development_costs FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can update own org development_costs" ON public.development_costs;
CREATE POLICY "Users can update own org development_costs" ON public.development_costs FOR UPDATE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can delete own org development_costs" ON public.development_costs;
CREATE POLICY "Users can delete own org development_costs" ON public.development_costs FOR DELETE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Expenses RLS Policies
DROP POLICY IF EXISTS "Users can view own org expenses" ON public.expenses;
CREATE POLICY "Users can view own org expenses" ON public.expenses FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can insert own org expenses" ON public.expenses;
CREATE POLICY "Users can insert own org expenses" ON public.expenses FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can update own org expenses" ON public.expenses;
CREATE POLICY "Users can update own org expenses" ON public.expenses FOR UPDATE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can delete own org expenses" ON public.expenses;
CREATE POLICY "Users can delete own org expenses" ON public.expenses FOR DELETE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Revenue RLS Policies
DROP POLICY IF EXISTS "Users can view own org revenue" ON public.revenue;
CREATE POLICY "Users can view own org revenue" ON public.revenue FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can insert own org revenue" ON public.revenue;
CREATE POLICY "Users can insert own org revenue" ON public.revenue FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can update own org revenue" ON public.revenue;
CREATE POLICY "Users can update own org revenue" ON public.revenue FOR UPDATE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can delete own org revenue" ON public.revenue;
CREATE POLICY "Users can delete own org revenue" ON public.revenue FOR DELETE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Miscellaneous RLS Policies
DROP POLICY IF EXISTS "Users can view own org miscellaneous" ON public.miscellaneous;
CREATE POLICY "Users can view own org miscellaneous" ON public.miscellaneous FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can insert own org miscellaneous" ON public.miscellaneous;
CREATE POLICY "Users can insert own org miscellaneous" ON public.miscellaneous FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can update own org miscellaneous" ON public.miscellaneous;
CREATE POLICY "Users can update own org miscellaneous" ON public.miscellaneous FOR UPDATE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can delete own org miscellaneous" ON public.miscellaneous;
CREATE POLICY "Users can delete own org miscellaneous" ON public.miscellaneous FOR DELETE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Broker Payments RLS Policies
DROP POLICY IF EXISTS "Users can view own org broker_payments" ON public.broker_payments;
CREATE POLICY "Users can view own org broker_payments" ON public.broker_payments FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can insert own org broker_payments" ON public.broker_payments;
CREATE POLICY "Users can insert own org broker_payments" ON public.broker_payments FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can update own org broker_payments" ON public.broker_payments;
CREATE POLICY "Users can update own org broker_payments" ON public.broker_payments FOR UPDATE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can delete own org broker_payments" ON public.broker_payments;
CREATE POLICY "Users can delete own org broker_payments" ON public.broker_payments FOR DELETE
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Audit Logs RLS Policies
DROP POLICY IF EXISTS "Users can view own org audit_logs" ON public.audit_logs;
CREATE POLICY "Users can view own org audit_logs" ON public.audit_logs FOR SELECT
USING ("orgId" = (auth.jwt() ->> 'organizationName')::text);

DROP POLICY IF EXISTS "Users can insert own org audit_logs" ON public.audit_logs;
CREATE POLICY "Users can insert own org audit_logs" ON public.audit_logs FOR INSERT
WITH CHECK ("orgId" = (auth.jwt() ->> 'organizationName')::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON public.user_profiles("organizationName");
CREATE INDEX IF NOT EXISTS idx_user_profiles_staffId ON public.user_profiles("staffId");
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects("orgId");
CREATE INDEX IF NOT EXISTS idx_projects_projectId ON public.projects("projectId");
CREATE INDEX IF NOT EXISTS idx_development_costs_org ON public.development_costs("orgId");
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses("orgId");
CREATE INDEX IF NOT EXISTS idx_revenue_org ON public.revenue("orgId");
CREATE INDEX IF NOT EXISTS idx_miscellaneous_org ON public.miscellaneous("orgId");
CREATE INDEX IF NOT EXISTS idx_broker_payments_org ON public.broker_payments("orgId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs("orgId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs("timestamp");

-- ==========================================
-- CLEANUP: DROP UNUSED TABLES
-- ==========================================
DROP TABLE IF EXISTS public.materials CASCADE;
DROP TABLE IF EXISTS public.labor CASCADE;
DROP TABLE IF EXISTS public.petty_cash CASCADE;
DROP TABLE IF EXISTS public.development_tools CASCADE;

