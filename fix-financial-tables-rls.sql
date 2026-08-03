-- RLS Policy Configuration for Financial Tables
-- This script enables RLS on financial tables and creates policies for authenticated users
-- Run this in your Supabase SQL Editor to fix 403 errors on financial table operations

-- Enable RLS on financial tables
ALTER TABLE development_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE miscellaneous ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Development Tools RLS Policies
DROP POLICY IF EXISTS "development_tools_select_policy" ON development_tools;
CREATE POLICY "development_tools_select_policy" ON development_tools
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "development_tools_insert_policy" ON development_tools;
CREATE POLICY "development_tools_insert_policy" ON development_tools
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "development_tools_update_policy" ON development_tools;
CREATE POLICY "development_tools_update_policy" ON development_tools
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "development_tools_delete_policy" ON development_tools;
CREATE POLICY "development_tools_delete_policy" ON development_tools
    FOR DELETE TO authenticated
    USING (true);

-- Development Costs RLS Policies
DROP POLICY IF EXISTS "development_costs_select_policy" ON development_costs;
CREATE POLICY "development_costs_select_policy" ON development_costs
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "development_costs_insert_policy" ON development_costs;
CREATE POLICY "development_costs_insert_policy" ON development_costs
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "development_costs_update_policy" ON development_costs;
CREATE POLICY "development_costs_update_policy" ON development_costs
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "development_costs_delete_policy" ON development_costs;
CREATE POLICY "development_costs_delete_policy" ON development_costs
    FOR DELETE TO authenticated
    USING (true);

-- Miscellaneous RLS Policies
DROP POLICY IF EXISTS "miscellaneous_select_policy" ON miscellaneous;
CREATE POLICY "miscellaneous_select_policy" ON miscellaneous
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "miscellaneous_insert_policy" ON miscellaneous;
CREATE POLICY "miscellaneous_insert_policy" ON miscellaneous
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "miscellaneous_update_policy" ON miscellaneous;
CREATE POLICY "miscellaneous_update_policy" ON miscellaneous
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "miscellaneous_delete_policy" ON miscellaneous;
CREATE POLICY "miscellaneous_delete_policy" ON miscellaneous
    FOR DELETE TO authenticated
    USING (true);

-- Broker Payments RLS Policies
DROP POLICY IF EXISTS "broker_payments_select_policy" ON broker_payments;
CREATE POLICY "broker_payments_select_policy" ON broker_payments
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "broker_payments_insert_policy" ON broker_payments;
CREATE POLICY "broker_payments_insert_policy" ON broker_payments
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "broker_payments_update_policy" ON broker_payments;
CREATE POLICY "broker_payments_update_policy" ON broker_payments
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "broker_payments_delete_policy" ON broker_payments;
CREATE POLICY "broker_payments_delete_policy" ON broker_payments
    FOR DELETE TO authenticated
    USING (true);

-- Expenses RLS Policies
DROP POLICY IF EXISTS "expenses_select_policy" ON expenses;
CREATE POLICY "expenses_select_policy" ON expenses
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;
CREATE POLICY "expenses_insert_policy" ON expenses
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "expenses_update_policy" ON expenses;
CREATE POLICY "expenses_update_policy" ON expenses
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "expenses_delete_policy" ON expenses;
CREATE POLICY "expenses_delete_policy" ON expenses
    FOR DELETE TO authenticated
    USING (true);

-- Revenue RLS Policies
DROP POLICY IF EXISTS "revenue_select_policy" ON revenue;
CREATE POLICY "revenue_select_policy" ON revenue
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "revenue_insert_policy" ON revenue;
CREATE POLICY "revenue_insert_policy" ON revenue
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "revenue_update_policy" ON revenue;
CREATE POLICY "revenue_update_policy" ON revenue
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "revenue_delete_policy" ON revenue;
CREATE POLICY "revenue_delete_policy" ON revenue
    FOR DELETE TO authenticated
    USING (true);

-- Projects RLS Policies
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "projects_update_policy" ON projects;
CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE TO authenticated
    USING (true);
