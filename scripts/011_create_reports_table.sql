-- Tabela para denúncias de usuários
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'harassment', 'inappropriate', 'fake', 'security', 'other')),
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'project', 'message', 'content')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver suas próprias denúncias
CREATE POLICY "reports_select_own" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Usuários podem criar denúncias
CREATE POLICY "reports_insert_auth" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Apenas service role pode atualizar/deletar (admin)
CREATE POLICY "reports_admin_all" ON reports
    FOR ALL USING (current_setting('role') = 'service_role');

-- Índices
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_reports_updated_at();
