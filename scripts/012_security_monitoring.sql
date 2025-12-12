-- Tabela de logs de segurança persistentes
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_agent TEXT,
  path TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Apenas service role pode inserir (via API)
CREATE POLICY "Service role can insert security logs"
ON security_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Apenas admins podem ver logs (via service role)
CREATE POLICY "Service role can read security logs"
ON security_logs FOR SELECT
TO service_role
USING (true);

-- Tabela de IPs bloqueados (backup do Redis)
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  blocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_permanent BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON blocked_ips(expires_at);

ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages blocked IPs"
ON blocked_ips FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Tabela de sessões ativas
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
ON active_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
ON active_sessions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages sessions"
ON active_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Função para limpar sessões e logs antigos
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS void AS $$
BEGIN
  -- Remove sessões expiradas
  DELETE FROM active_sessions WHERE expires_at < NOW();
  
  -- Remove IPs bloqueados expirados
  DELETE FROM blocked_ips WHERE expires_at < NOW() AND NOT is_permanent;
  
  -- Remove logs com mais de 90 dias
  DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Métricas de uso
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value BIGINT DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metric_name, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_name_date ON usage_metrics(metric_name, date);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages metrics"
ON usage_metrics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Função para incrementar métricas
CREATE OR REPLACE FUNCTION increment_metric(p_metric_name TEXT, p_increment INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_metrics (metric_name, metric_value, date, hour)
  VALUES (p_metric_name, p_increment, CURRENT_DATE, EXTRACT(HOUR FROM NOW()))
  ON CONFLICT (metric_name, date, hour)
  DO UPDATE SET metric_value = usage_metrics.metric_value + p_increment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
