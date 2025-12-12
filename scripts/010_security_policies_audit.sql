-- Script de auditoria e melhorias de segurança para RLS
-- Execute este script para garantir que todas as tabelas têm políticas RLS adequadas

-- 1. Verificar se RLS está habilitado em todas as tabelas importantes
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
        RAISE NOTICE 'RLS habilitado na tabela: %', tbl.tablename;
    END LOOP;
END $$;

-- 2. Política para builder_projects - garantir que apenas o dono pode ver/editar
DROP POLICY IF EXISTS "builder_projects_select_own" ON builder_projects;
DROP POLICY IF EXISTS "builder_projects_insert_own" ON builder_projects;
DROP POLICY IF EXISTS "builder_projects_update_own" ON builder_projects;
DROP POLICY IF EXISTS "builder_projects_delete_own" ON builder_projects;

CREATE POLICY "builder_projects_select_own" ON builder_projects
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "builder_projects_insert_own" ON builder_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "builder_projects_update_own" ON builder_projects
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "builder_projects_delete_own" ON builder_projects
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Política para builder_projects públicos (compartilhados)
CREATE POLICY "builder_projects_select_public" ON builder_projects
    FOR SELECT USING (is_public = true);

-- 4. Política para builder_files
DROP POLICY IF EXISTS "builder_files_select_own" ON builder_files;
DROP POLICY IF EXISTS "builder_files_insert_own" ON builder_files;
DROP POLICY IF EXISTS "builder_files_update_own" ON builder_files;
DROP POLICY IF EXISTS "builder_files_delete_own" ON builder_files;

CREATE POLICY "builder_files_select_own" ON builder_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM builder_projects 
            WHERE builder_projects.id = builder_files.project_id 
            AND (builder_projects.user_id = auth.uid() OR builder_projects.is_public = true)
        )
    );

CREATE POLICY "builder_files_insert_own" ON builder_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM builder_projects 
            WHERE builder_projects.id = builder_files.project_id 
            AND builder_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "builder_files_update_own" ON builder_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM builder_projects 
            WHERE builder_projects.id = builder_files.project_id 
            AND builder_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "builder_files_delete_own" ON builder_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM builder_projects 
            WHERE builder_projects.id = builder_files.project_id 
            AND builder_projects.user_id = auth.uid()
        )
    );

-- 5. Garantir que usage_limits só pode ser lido/atualizado pelo próprio usuário
DROP POLICY IF EXISTS "usage_limits_service_update" ON usage_limits;
CREATE POLICY "usage_limits_service_update" ON usage_limits
    FOR UPDATE USING (auth.uid() = user_id OR current_setting('role') = 'service_role');

-- 6. Adicionar índices para melhor performance das queries de segurança
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_likes_from_user ON likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to_user ON likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_builder_projects_user ON builder_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_projects_public ON builder_projects(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- 7. Função para logging de ações sensíveis (auditoria)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas service role pode ler audit logs
CREATE POLICY "audit_log_service_only" ON audit_log
    FOR ALL USING (current_setting('role') = 'service_role');

-- 8. Função trigger para auditoria automática de perfis
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (auth.uid(), 'UPDATE', 'profiles', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_data)
        VALUES (auth.uid(), 'DELETE', 'profiles', OLD.id, to_jsonb(OLD));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
CREATE TRIGGER audit_profiles_trigger
    AFTER UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_profile_changes();

-- 9. Função para limpar dados antigos de signaling (privacidade)
CREATE OR REPLACE FUNCTION cleanup_old_signaling_data()
RETURNS void AS $$
BEGIN
    DELETE FROM signaling WHERE created_at < NOW() - INTERVAL '1 hour';
    DELETE FROM ice_candidates WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. View segura para estatísticas públicas (sem expor dados sensíveis)
CREATE OR REPLACE VIEW public_stats AS
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE is_online = true) as online_users,
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM matches) as total_matches;

GRANT SELECT ON public_stats TO anon, authenticated;
