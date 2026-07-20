-- Supabase SQL Schema for ACRUX IT SOLUTIONS ERP
-- Standardized version with consistent TIMESTAMPTZ dates and Audit Tracking

-- 1. Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sync Timestamp Trigger Function
CREATE OR REPLACE FUNCTION update_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- serverUpdatedAt is used by the SyncEngine to pull incremental changes
  NEW."serverUpdatedAt" = NOW();
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Projects
CREATE TABLE IF NOT EXISTS projects (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "clientName" TEXT,
    "location" TEXT,
    "projectType" TEXT,
    "status" TEXT, 
    "startDate" TIMESTAMPTZ, 
    "endDate" TIMESTAMPTZ,
    "projectManager" TEXT, 
    "createdBy" TEXT, 
    "updatedBy" TEXT,
    "documentUrl" TEXT,
    "description" TEXT,
    "budget" NUMERIC,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "projectId" TEXT, 
    "category" TEXT,
    "description" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT DEFAULT 'LRD',
    "vendor" TEXT,
    "date" TIMESTAMPTZ, 
    "invoiceNumber" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "receiptUrl" TEXT, 
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Revenue (Payments Received)
CREATE TABLE IF NOT EXISTS revenue (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "projectId" TEXT,
    "description" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT DEFAULT 'LRD',
    "source" TEXT,
    "date" TIMESTAMPTZ, 
    "invoiceNumber" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Development Tools Table
CREATE TABLE IF NOT EXISTS development_tools (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "projectId" TEXT,
    "toolName" TEXT NOT NULL,
    "quantity" NUMERIC NOT NULL,
    "unitCost" NUMERIC NOT NULL,
    "totalCost" NUMERIC NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "date" TIMESTAMPTZ,
    "receiptUrl" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Development Costs Table
CREATE TABLE IF NOT EXISTS development_costs (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "projectId" TEXT,
    "developerId" TEXT,
    "developerName" TEXT NOT NULL,
    "role" TEXT,
    "cost" NUMERIC NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "paymentDate" TIMESTAMPTZ NOT NULL,
    "receiptUrl" TEXT,
    "createdBy" TEXT, 
    "updatedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Miscellaneous Table
CREATE TABLE IF NOT EXISTS miscellaneous (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "projectId" TEXT,
    "date" TIMESTAMPTZ,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "receiptUrl" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Broker Payments Table
CREATE TABLE IF NOT EXISTS broker_payments (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "projectId" TEXT,
    "brokerId" TEXT,
    "brokerName" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT DEFAULT 'LRD',
    "paymentDate" TIMESTAMPTZ,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT,
    "userId" TEXT NOT NULL, 
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "timestamp" TIMESTAMPTZ DEFAULT NOW(),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 12. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "email" TEXT UNIQUE NOT NULL,
    "staffId" TEXT,
    "name" TEXT,
    "role" TEXT,
    "isAdmin" BOOLEAN DEFAULT FALSE,
    "organizationName" TEXT,
    "department" TEXT,
    "defaultCurrency" TEXT DEFAULT 'LRD',
    "securityQuestion" TEXT,
    "securityAnswerHash" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "serverUpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Revenue Dashboard View (Financial Mirror)
DROP VIEW IF EXISTS revenue_report CASCADE;
CREATE OR REPLACE VIEW revenue_report AS
WITH 
  project_sums AS (
    SELECT LOWER("projectId") as project_slug, LOWER("orgId") as org_slug, COALESCE(SUM("totalCost"), 0) as total_tools
    FROM development_tools WHERE "isDeleted" = false GROUP BY LOWER("projectId"), LOWER("orgId")
  ),
  development_sums AS (
    SELECT LOWER("projectId") as project_slug, LOWER("orgId") as org_slug, COALESCE(SUM("cost"), 0) as total_development
    FROM development_costs WHERE "isDeleted" = false GROUP BY LOWER("projectId"), LOWER("orgId")
  ),
  misc_sums AS (
    SELECT LOWER("projectId") as project_slug, LOWER("orgId") as org_slug, COALESCE(SUM("amount"), 0) as total_misc
    FROM miscellaneous WHERE "isDeleted" = false GROUP BY LOWER("projectId"), LOWER("orgId")
  ),
  broker_sums AS (
    SELECT LOWER("projectId") as project_slug, LOWER("orgId") as org_slug, COALESCE(SUM("amount"), 0) as total_broker
    FROM broker_payments WHERE "isDeleted" = false GROUP BY LOWER("projectId"), LOWER("orgId")
  ),
  revenue_sums AS (
    SELECT LOWER("projectId") as project_slug, LOWER("orgId") as org_slug, COALESCE(SUM("amount"), 0) as total_received
    FROM revenue WHERE "isDeleted" = false GROUP BY LOWER("projectId"), LOWER("orgId")
  )
SELECT 
  p.id as id, p."orgId", p."projectId", p."name" as project_name,
  COALESCE(p.budget, 0) as total_budget,
  COALESCE(m.total_tools, 0) as total_tools,
  COALESCE(l.total_development, 0) as total_development,
  COALESCE(b.total_broker, 0) as total_broker,
  COALESCE(pt.total_misc, 0) as total_misc,
  (COALESCE(m.total_tools, 0) + COALESCE(l.total_development, 0) + COALESCE(b.total_broker, 0) + COALESCE(pt.total_misc, 0)) as total_expenses,
  (COALESCE(p.budget, 0) - (COALESCE(m.total_tools, 0) + COALESCE(l.total_development, 0) + COALESCE(b.total_broker, 0) + COALESCE(pt.total_misc, 0))) as company_revenue,
  COALESCE(rev.total_received, 0) as amount_received,
  (COALESCE(p.budget, 0) - COALESCE(rev.total_received, 0)) as outstanding,
  p."documentUrl" as proof_link,
  p."serverUpdatedAt" as "serverUpdatedAt"
FROM projects p
LEFT JOIN project_sums m ON LOWER(p."projectId") = m.project_slug AND LOWER(p."orgId") = m.org_slug
LEFT JOIN development_sums l ON LOWER(p."projectId") = l.project_slug AND LOWER(p."orgId") = l.org_slug
LEFT JOIN broker_sums b ON LOWER(p."projectId") = b.project_slug AND LOWER(p."orgId") = b.org_slug
LEFT JOIN misc_sums pt ON LOWER(p."projectId") = pt.project_slug AND LOWER(p."orgId") = pt.org_slug
LEFT JOIN revenue_sums rev ON LOWER(p."projectId") = rev.project_slug AND LOWER(p."orgId") = rev.org_slug
WHERE p."isDeleted" = false;

-- 14. Apply Sync Triggers
DO $$ 
DECLARE
    tab RECORD;
BEGIN
    FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys')) 
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_sync_%I ON %I', tab.tablename, tab.tablename);
        EXECUTE format('CREATE TRIGGER tr_sync_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_sync_timestamp()', tab.tablename, tab.tablename);
    END LOOP;
END $$;

-- 15. Enable RLS (Security Hardening)
-- Disabling RLS for now to ensure all users can access their profiles correctly
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE labor ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE broker_payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 15b. Audit Logs RLS
-- Audit logs must allow INSERT/UPSERT by any authenticated user (append-only system log).
-- Without these policies, the SyncEngine gets 403 errors when trying to push audit entries.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert audit logs
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to read audit logs
DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT TO authenticated
    USING (true);

-- Allow upsert (UPDATE) for sync engine
DROP POLICY IF EXISTS "audit_logs_update_policy" ON audit_logs;
CREATE POLICY "audit_logs_update_policy" ON audit_logs
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- 15c. Ensure Columns Exist (Safe for existing tables)
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS "budget" NUMERIC;
ALTER TABLE IF EXISTS expenses ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE IF EXISTS revenue ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE IF EXISTS development_tools ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE IF EXISTS development_costs ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE IF EXISTS miscellaneous ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE IF EXISTS broker_payments ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';

-- 17. Cascading Soft-Delete Trigger
-- Uses LOWER() comparison on projectId so uppercase/lowercase entries both match.
-- Matches on project UUID (id) OR on the human-readable project slug (projectId field).
CREATE OR REPLACE FUNCTION cascade_project_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."isDeleted" = true AND OLD."isDeleted" = false THEN
    -- Development Tools
    UPDATE development_tools SET "isDeleted" = true
      WHERE LOWER("projectId") = LOWER(NEW."id")
         OR LOWER("projectId") = LOWER(COALESCE(NEW."projectId", '##NOMATCH##'));
    -- Development Costs
    UPDATE development_costs SET "isDeleted" = true
      WHERE LOWER("projectId") = LOWER(NEW."id")
         OR LOWER("projectId") = LOWER(COALESCE(NEW."projectId", '##NOMATCH##'));
    -- Revenue
    UPDATE revenue SET "isDeleted" = true
      WHERE LOWER("projectId") = LOWER(NEW."id")
         OR LOWER("projectId") = LOWER(COALESCE(NEW."projectId", '##NOMATCH##'));
    -- Expenses
    UPDATE expenses SET "isDeleted" = true
      WHERE LOWER("projectId") = LOWER(NEW."id")
         OR LOWER("projectId") = LOWER(COALESCE(NEW."projectId", '##NOMATCH##'));
    -- Miscellaneous
    UPDATE miscellaneous SET "isDeleted" = true
      WHERE LOWER("projectId") = LOWER(NEW."id")
         OR LOWER("projectId") = LOWER(COALESCE(NEW."projectId", '##NOMATCH##'));
    -- Broker Payments
    UPDATE broker_payments SET "isDeleted" = true
      WHERE LOWER("projectId") = LOWER(NEW."id")
         OR LOWER("projectId") = LOWER(COALESCE(NEW."projectId", '##NOMATCH##'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_cascade_project_delete ON projects;
CREATE TRIGGER tr_cascade_project_delete
AFTER UPDATE OF "isDeleted" ON projects
FOR EACH ROW
EXECUTE FUNCTION cascade_project_soft_delete();

-- 18. Organization Slug Maintenance
UPDATE projects SET "orgId" = LOWER(REPLACE(REPLACE("orgId", ' ', '-'), '&', 'and')) WHERE "orgId" IS NOT NULL AND "orgId" <> LOWER(REPLACE(REPLACE("orgId", ' ', '-'), '&', 'and'));

-- 19. Normalize existing projectId to UPPERCASE across all financial tables
-- Run this once to unify any old lowercase/mixed-case data
UPDATE revenue SET "projectId" = UPPER("projectId") WHERE "projectId" IS NOT NULL AND "projectId" <> UPPER("projectId");
UPDATE development_tools SET "projectId" = UPPER("projectId") WHERE "projectId" IS NOT NULL AND "projectId" <> UPPER("projectId");
UPDATE development_costs SET "projectId" = UPPER("projectId") WHERE "projectId" IS NOT NULL AND "projectId" <> UPPER("projectId");
UPDATE miscellaneous SET "projectId" = UPPER("projectId") WHERE "projectId" IS NOT NULL AND "projectId" <> UPPER("projectId");
UPDATE broker_payments SET "projectId" = UPPER("projectId") WHERE "projectId" IS NOT NULL AND "projectId" <> UPPER("projectId");
UPDATE expenses SET "projectId" = UPPER("projectId") WHERE "projectId" IS NOT NULL AND "projectId" <> UPPER("projectId");
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS "defaultCurrency" TEXT DEFAULT 'USD';
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS "securityQuestion" TEXT;
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS "securityAnswerHash" TEXT;
