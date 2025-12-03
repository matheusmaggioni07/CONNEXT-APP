-- =============================================
-- TABELAS PARA VIDEOCHAMADA EM TEMPO REAL
-- Execute este script para habilitar videochamadas
-- =============================================

-- Tabela para sinalização WebRTC (ofertas e respostas)
CREATE TABLE IF NOT EXISTS signaling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer')),
  sdp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE
);

-- Tabela para candidatos ICE
CREATE TABLE IF NOT EXISTS ice_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  candidate TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_signaling_room ON signaling(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_to_user ON signaling(to_user_id, processed);
CREATE INDEX IF NOT EXISTS idx_signaling_created ON signaling(created_at);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_room ON ice_candidates(room_id);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_to_user ON ice_candidates(to_user_id, processed);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_created ON ice_candidates(created_at);

-- Habilitar RLS
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "signaling_select_own" ON signaling;
DROP POLICY IF EXISTS "signaling_insert_own" ON signaling;
DROP POLICY IF EXISTS "signaling_update_own" ON signaling;
DROP POLICY IF EXISTS "signaling_delete_own" ON signaling;
DROP POLICY IF EXISTS "ice_candidates_select_own" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_insert_own" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_update_own" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_delete_own" ON ice_candidates;

-- Políticas RLS para signaling
CREATE POLICY "signaling_select_own" ON signaling
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "signaling_insert_own" ON signaling
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "signaling_update_own" ON signaling
  FOR UPDATE USING (auth.uid() = to_user_id);

CREATE POLICY "signaling_delete_own" ON signaling
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Políticas RLS para ice_candidates
CREATE POLICY "ice_candidates_select_own" ON ice_candidates
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "ice_candidates_insert_own" ON ice_candidates
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "ice_candidates_update_own" ON ice_candidates
  FOR UPDATE USING (auth.uid() = to_user_id);

CREATE POLICY "ice_candidates_delete_own" ON ice_candidates
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Função para limpar sinalização antiga (mais de 5 minutos)
CREATE OR REPLACE FUNCTION cleanup_old_signaling()
RETURNS void AS $$
BEGIN
  DELETE FROM signaling WHERE created_at < NOW() - INTERVAL '5 minutes';
  DELETE FROM ice_candidates WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar realtime para as tabelas (necessário para videochamada funcionar)
DO $$
BEGIN
  -- Tenta adicionar as tabelas ao realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE signaling;
  EXCEPTION WHEN OTHERS THEN
    -- Tabela já existe na publicação
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ice_candidates;
  EXCEPTION WHEN OTHERS THEN
    -- Tabela já existe na publicação
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE video_rooms;
  EXCEPTION WHEN OTHERS THEN
    -- Tabela já existe na publicação
    NULL;
  END;
END $$;
