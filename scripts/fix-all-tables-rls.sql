-- Fix RLS Policies for operational tables (Idempotent script)
-- This script checks if a table exists before attempting to create policies.
-- It grants full CRUD access to users for records that match their organization's slug.

DO $$ 
DECLARE 
    table_name text;
    tables_to_check text[] := ARRAY[
        'projects', 
        'development_tools', 
        'broker_payments', 
        'miscellaneous', 
        'revenue', 
        'audit_logs', 
        'expenses', 
        'petty_cash',
        'materials',
        'development_costs'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        -- Check if the table exists in the public schema
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            
            -- Drop the old policy if it exists
            EXECUTE format('DROP POLICY IF EXISTS "Org members full access" ON public.%I', table_name);
            
            -- Create the new policy
            EXECUTE format(
                'CREATE POLICY "Org members full access" ON public.%I ' ||
                'FOR ALL TO authenticated ' ||
                'USING ("orgId" = (auth.jwt() -> ''app_metadata'' ->> ''organizationName'')::text) ' ||
                'WITH CHECK ("orgId" = (auth.jwt() -> ''app_metadata'' ->> ''organizationName'')::text)', 
                table_name
            );
            
            RAISE NOTICE 'Applied RLS policy to %', table_name;
        ELSE
            RAISE NOTICE 'Table % does not exist yet. Skipping...', table_name;
        END IF;
    END LOOP;
END $$;
