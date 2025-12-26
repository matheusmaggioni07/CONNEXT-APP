-- SIMPLES: Apenas desabilita RLS nas 3 tabelas de video que EXISTEM
-- Sem tentar mexer em colunas que não existem

ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;
