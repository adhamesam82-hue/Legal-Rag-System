-- Migration 0029: Tenant Row-Level Security (RLS) and unprivileged application role
-- Implements T-047: strict tenant isolation at the database layer.

-- 1. Create or configure the application role: unprivileged, non-owner, cannot bypass RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'legalrag_app') THEN
        CREATE ROLE legalrag_app WITH LOGIN PASSWORD 'legalrag_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    ELSE
        ALTER ROLE legalrag_app WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;

-- Grant permissions to legalrag_app for normal operation
GRANT USAGE ON SCHEMA public TO legalrag_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO legalrag_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO legalrag_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO legalrag_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO legalrag_app;

-- 2. Enable, Force, and apply tenant isolation policy on every table with organization_id in public schema
-- Excludes:
--   - 'organizations' (tenant root, does not carry foreign organization_id)
--   - 'memberships' (read during auth before tenant context can be set)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE column_name = 'organization_id'
          AND table_schema = 'public'
          AND table_name NOT IN ('organizations', 'memberships')
        ORDER BY table_name
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', r.table_name);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I ' ||
            'USING (organization_id = current_setting(''app.organization_id'', true)::bigint) ' ||
            'WITH CHECK (organization_id = current_setting(''app.organization_id'', true)::bigint)',
            r.table_name
        );
    END LOOP;
END
$$;
