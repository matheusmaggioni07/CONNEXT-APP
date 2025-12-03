-- =============================================
-- CORREÇÕES PARA VIDEOCHAMADA 100% FUNCIONAL
-- Execute este script para garantir funcionamento
-- =============================================

-- 1. Garantir que as tabelas de sinalização existam com todas as colunas
DO $$
BEGIN
  -- Criar tabela signaling se não existir
  CREATE TABLE IF NOT EXISTS signaling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    type TEXT NOT NULL,
    sdp TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

DO $$
BEGIN
  -- Criar tabela ice_candidates se não existir
  CREATE TABLE IF NOT EXISTS ice_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    candidate TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-- 2. Habilitar RLS
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas e criar novas mais permissivas
DROP POLICY IF EXISTS "signaling_all" ON signaling;
DROP POLICY IF EXISTS "ice_all" ON ice_candidates;
DROP POLICY IF EXISTS "signaling_select" ON signaling;
DROP POLICY IF EXISTS "signaling_insert" ON signaling;
DROP POLICY IF EXISTS "signaling_delete" ON signaling;
DROP POLICY IF EXISTS "ice_select" ON ice_candidates;
DROP POLICY IF EXISTS "ice_insert" ON ice_candidates;
DROP POLICY IF EXISTS "ice_delete" ON ice_candidates;

-- Políticas para signaling (mais permissivas para WebRTC funcionar)
CREATE POLICY "signaling_select" ON signaling
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "signaling_insert" ON signaling
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "signaling_delete" ON signaling
  FOR DELETE TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Políticas para ice_candidates
CREATE POLICY "ice_select" ON ice_candidates
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "ice_insert" ON ice_candidates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "ice_delete" ON ice_candidates
  FOR DELETE TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_signaling_room_id ON signaling(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_to_user ON signaling(to_user_id);
CREATE INDEX IF NOT EXISTS idx_signaling_from_user ON signaling(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ice_room_id ON ice_candidates(room_id);
CREATE INDEX IF NOT EXISTS idx_ice_to_user ON ice_candidates(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ice_from_user ON ice_candidates(from_user_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_status ON video_rooms(status);
CREATE INDEX IF NOT EXISTS idx_video_rooms_user1 ON video_rooms(user1_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_user2 ON video_rooms(user2_id);

-- 5. Função para incrementar chamadas diárias
CREATE OR REPLACE FUNCTION increment_daily_calls(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_today DATE;
BEGIN
  -- Pegar data de hoje no fuso horário de Brasília
  v_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  UPDATE profiles 
  SET 
    daily_calls_count = COALESCE(daily_calls_count, 0) + 1,
    last_activity_reset = CASE 
      WHEN last_activity_reset IS NULL OR last_activity_reset < v_today 
      THEN v_today 
      ELSE last_activity_reset 
    END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para limpar dados antigos de sinalização
CREATE OR REPLACE FUNCTION cleanup_signaling()
RETURNS void AS $$
BEGIN
  DELETE FROM signaling WHERE created_at < NOW() - INTERVAL '10 minutes';
  DELETE FROM ice_candidates WHERE created_at < NOW() - INTERVAL '10 minutes';
  DELETE FROM video_rooms WHERE status = 'ended' AND ended_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Habilitar Realtime para as tabelas necessárias
DO $$
BEGIN
  -- Tentar adicionar tabelas ao realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE signaling;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Já existe
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ice_candidates;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE video_rooms;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 8. Garantir que video_rooms tenha todas as políticas necessárias
DROP POLICY IF EXISTS "video_rooms_select_all" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_insert_all" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_update_all" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_delete_all" ON video_rooms;

CREATE POLICY "video_rooms_select_all" ON video_rooms
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "video_rooms_insert_all" ON video_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "video_rooms_update_all" ON video_rooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id OR user2_id IS NULL);

CREATE POLICY "video_rooms_delete_all" ON video_rooms
  FOR DELETE TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
