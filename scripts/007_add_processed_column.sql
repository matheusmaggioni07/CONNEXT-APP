-- =============================================
-- ADICIONAR COLUNA PROCESSED ÀS TABELAS DE SINALIZAÇÃO
-- Este script adiciona a coluna 'processed' que falta nas tabelas
-- =============================================

-- Adicionar coluna processed à tabela signaling (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'signaling' 
    AND column_name = 'processed'
  ) THEN
    ALTER TABLE signaling ADD COLUMN processed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Adicionar coluna processed à tabela ice_candidates (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ice_candidates' 
    AND column_name = 'processed'
  ) THEN
    ALTER TABLE ice_candidates ADD COLUMN processed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Criar índices para a coluna processed (se não existirem)
CREATE INDEX IF NOT EXISTS idx_signaling_to_user_processed ON signaling(to_user_id, processed);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_to_user_processed ON ice_candidates(to_user_id, processed);

-- Atualizar políticas RLS para permitir UPDATE (para marcar como processed)
DROP POLICY IF EXISTS "signaling_update_own" ON signaling;
DROP POLICY IF EXISTS "ice_candidates_update_own" ON ice_candidates;

CREATE POLICY "signaling_update_own" ON signaling
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "ice_candidates_update_own" ON ice_candidates
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- Limpar dados antigos de sinalização
DELETE FROM signaling WHERE created_at < NOW() - INTERVAL '1 hour';
DELETE FROM ice_candidates WHERE created_at < NOW() - INTERVAL '1 hour';
