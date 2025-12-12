-- Security hardening script for Connext App
-- Run this to ensure maximum security on all tables

-- 1. Ensure RLS is enabled on ALL tables
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', tbl.schemaname, tbl.tablename);
        RAISE NOTICE 'RLS enabled on %.%', tbl.schemaname, tbl.tablename;
    END LOOP;
END $$;

-- 2. Create security audit log table if not exists
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_ip ON security_audit_log(ip_address);

-- Enable RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- System can insert audit logs (service role)
CREATE POLICY "System can insert audit logs" ON security_audit_log
    FOR INSERT WITH CHECK (true);

-- 3. Create blocked IPs table for persistent blocks
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reason TEXT,
    blocked_by UUID REFERENCES auth.users(id),
    blocked_until TIMESTAMPTZ,
    is_permanent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);

ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked IPs
CREATE POLICY "Admins can manage blocked IPs" ON blocked_ips
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 4. Ensure profiles have proper policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles visible" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND (role IS NULL OR role = 'user') -- Cannot self-promote to admin
    );

CREATE POLICY "Public profiles visible to authenticated" ON profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND (is_profile_public = true OR auth.uid() = id)
    );

-- 5. Ensure builder_projects have proper policies  
DROP POLICY IF EXISTS "Users can manage own projects" ON builder_projects;

CREATE POLICY "Users can view own projects" ON builder_projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON builder_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON builder_projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON builder_projects
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public projects visible" ON builder_projects
    FOR SELECT USING (is_public = true);

-- 6. Ensure builder_files have proper policies
DROP POLICY IF EXISTS "Users can manage own files" ON builder_files;

CREATE POLICY "Users can manage own files" ON builder_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM builder_projects 
            WHERE builder_projects.id = builder_files.project_id 
            AND builder_projects.user_id = auth.uid()
        )
    );

-- 7. Function to auto-delete expired blocked IPs
CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS void AS $$
BEGIN
    DELETE FROM blocked_ips 
    WHERE blocked_until < NOW() 
    AND is_permanent = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO security_audit_log (event_type, user_id, ip_address, details)
    VALUES (p_event_type, p_user_id, p_ip_address, p_details)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Revoke public access to functions
REVOKE ALL ON FUNCTION cleanup_expired_blocks FROM PUBLIC;
REVOKE ALL ON FUNCTION log_security_event FROM PUBLIC;

-- Grant to service role only
GRANT EXECUTE ON FUNCTION cleanup_expired_blocks TO service_role;
GRANT EXECUTE ON FUNCTION log_security_event TO service_role;

-- 10. Add comment for documentation
COMMENT ON TABLE security_audit_log IS 'Audit log for security events - login attempts, blocked IPs, suspicious activity';
COMMENT ON TABLE blocked_ips IS 'Permanently or temporarily blocked IP addresses';
