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
  orgId text NOT NULL,
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
  orgId text NOT NULL,
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
  orgId text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text NOT NULL,
  itemName text NOT NULL,
  quantity numeric NOT NULL,
  unit text,
  unitCost numeric NOT NULL,
  totalCost numeric GENERATED ALWAYS AS (quantity * unitCost) STORED,
  supplier text,
  date timestamptz DEFAULT now(),
  orgId text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create labor table
CREATE TABLE IF NOT EXISTS public.labor (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text NOT NULL,
  workerName text NOT NULL,
  hours numeric NOT NULL,
  hourlyRate numeric NOT NULL,
  totalCost numeric GENERATED ALWAYS AS (hours * hourlyRate) STORED,
  date timestamptz DEFAULT now(),
  orgId text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create petty_cash table
CREATE TABLE IF NOT EXISTS public.petty_cash (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projectId text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  date timestamptz DEFAULT now(),
  orgId text NOT NULL,
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
  orgId text NOT NULL,
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
  orgId text NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations RLS Policies
CREATE POLICY "Users can view own org" ON public.organizations FOR SELECT
USING (id = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Admins can insert orgs" ON public.organizations FOR INSERT
WITH CHECK ((auth.jwt() ->> 'isAdmin')::boolean = true);

CREATE POLICY "Admins can update orgs" ON public.organizations FOR UPDATE
USING ((auth.jwt() ->> 'isAdmin')::boolean = true);

-- User Profiles RLS Policies
CREATE POLICY "View own org profiles" ON public.user_profiles FOR SELECT
USING ("organizationName" = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Insert own profile" ON public.user_profiles FOR INSERT
WITH CHECK (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
);

CREATE POLICY "Update own or org profiles" ON public.user_profiles FOR UPDATE
USING (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
)
WITH CHECK (
  auth.uid() = id OR 
  ((auth.jwt() ->> 'isAdmin')::boolean = true AND "organizationName" = (auth.jwt() ->> 'organizationName')::text)
);

CREATE POLICY "Delete org profiles" ON public.user_profiles FOR DELETE
USING (
  (auth.jwt() ->> 'isAdmin')::boolean = true AND
  "organizationName" = (auth.jwt() ->> 'organizationName')::text
);

-- Projects RLS Policies
CREATE POLICY "Users can view own org projects" ON public.projects FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org projects" ON public.projects FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can update own org projects" ON public.projects FOR UPDATE
USING (orgId = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can delete own org projects" ON public.projects FOR DELETE
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Expenses RLS Policies
CREATE POLICY "Users can view own org expenses" ON public.expenses FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org expenses" ON public.expenses FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can update own org expenses" ON public.expenses FOR UPDATE
USING (orgId = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can delete own org expenses" ON public.expenses FOR DELETE
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Revenue RLS Policies
CREATE POLICY "Users can view own org revenue" ON public.revenue FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org revenue" ON public.revenue FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can update own org revenue" ON public.revenue FOR UPDATE
USING (orgId = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can delete own org revenue" ON public.revenue FOR DELETE
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Materials RLS Policies
CREATE POLICY "Users can view own org materials" ON public.materials FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org materials" ON public.materials FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can update own org materials" ON public.materials FOR UPDATE
USING (orgId = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can delete own org materials" ON public.materials FOR DELETE
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Labor RLS Policies
CREATE POLICY "Users can view own org labor" ON public.labor FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org labor" ON public.labor FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can update own org labor" ON public.labor FOR UPDATE
USING (orgId = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can delete own org labor" ON public.labor FOR DELETE
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Petty Cash RLS Policies
CREATE POLICY "Users can view own org petty_cash" ON public.petty_cash FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org petty_cash" ON public.petty_cash FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can update own org petty_cash" ON public.petty_cash FOR UPDATE
USING (orgId = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can delete own org petty_cash" ON public.petty_cash FOR DELETE
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Broker Payments RLS Policies
CREATE POLICY "Users can view own org broker_payments" ON public.broker_payments FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org broker_payments" ON public.broker_payments FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can update own org broker_payments" ON public.broker_payments FOR UPDATE
USING (orgId = (auth.jwt() ->> 'organizationName')::text)
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can delete own org broker_payments" ON public.broker_payments FOR DELETE
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Audit Logs RLS Policies
CREATE POLICY "Users can view own org audit_logs" ON public.audit_logs FOR SELECT
USING (orgId = (auth.jwt() ->> 'organizationName')::text);

CREATE POLICY "Users can insert own org audit_logs" ON public.audit_logs FOR INSERT
WITH CHECK (orgId = (auth.jwt() ->> 'organizationName')::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON public.user_profiles("organizationName");
CREATE INDEX IF NOT EXISTS idx_user_profiles_staffId ON public.user_profiles("staffId");
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects("orgId");
CREATE INDEX IF NOT EXISTS idx_projects_projectId ON public.projects("projectId");
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses("orgId");
CREATE INDEX IF NOT EXISTS idx_revenue_org ON public.revenue("orgId");
CREATE INDEX IF NOT EXISTS idx_materials_org ON public.materials("orgId");
CREATE INDEX IF NOT EXISTS idx_labor_org ON public.labor("orgId");
CREATE INDEX IF NOT EXISTS idx_petty_cash_org ON public.petty_cash("orgId");
CREATE INDEX IF NOT EXISTS idx_broker_payments_org ON public.broker_payments("orgId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs("orgId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs("timestamp");
