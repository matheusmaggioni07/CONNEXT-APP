-- Remove RLS policies apenas das tabelas de video que EXISTEM
-- Não toca em nenhuma outra coluna ou tabela

-- Desabilitar RLS na tabela video_rooms
ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela signaling  
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela ice_candidates
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;

-- Deixar profiles como está (já funciona)
-- Não mexer em nada que não precise
