-- DESABILITAR RLS COMPLETAMENTE EM TODAS AS TABELAS
ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- DELETAR TODAS AS POLICIES (não só desabilitar)
DROP POLICY IF EXISTS "authenticated_users_all" ON video_rooms;
DROP POLICY IF EXISTS "authenticated_users_signaling_all" ON signaling;
DROP POLICY IF EXISTS "authenticated_users_ice_all" ON ice_candidates;

-- REMOVER QUALQUER TRIGGER QUE POSSA ESTAR BLOQUEANDO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- CONFIRMAR QUE RLS ESTÁ DESABILITADO
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('video_rooms', 'signaling', 'ice_candidates', 'profiles');
