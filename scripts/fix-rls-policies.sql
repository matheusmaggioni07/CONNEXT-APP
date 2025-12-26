-- Desabilitar RLS policies conflitantes que estão bloqueando video_rooms
ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;

-- Remover todas as policies antigas
DROP POLICY IF EXISTS "video_rooms_select" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_update_participants" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_insert_own" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_delete_all" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_select_participants" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_update_all" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_insert_all" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_select_all" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_update" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_insert" ON video_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON video_rooms;
DROP POLICY IF EXISTS "Users can update their rooms" ON video_rooms;
DROP POLICY IF EXISTS "Users can view their rooms" ON video_rooms;

-- Criar policies simples e eficientes
CREATE POLICY "authenticated_users_all" ON video_rooms
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Desabilitar RLS policies conflitantes em signaling
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signaling_select" ON signaling;
DROP POLICY IF EXISTS "signaling_insert" ON signaling;
DROP POLICY IF EXISTS "signaling_delete" ON signaling;
DROP POLICY IF EXISTS "signaling_select_own" ON signaling;
DROP POLICY IF EXISTS "signaling_insert_own" ON signaling;
DROP POLICY IF EXISTS "signaling_update_own" ON signaling;
DROP POLICY IF EXISTS "signaling_delete_own" ON signaling;
DROP POLICY IF EXISTS "Users can send signaling messages" ON signaling;
DROP POLICY IF EXISTS "Users can insert signaling for their rooms" ON signaling;
DROP POLICY IF EXISTS "Users can view signaling sent to them" ON signaling;
DROP POLICY IF EXISTS "Users can delete their signaling" ON signaling;
DROP POLICY IF EXISTS "Users can see signaling messages for their calls" ON signaling;

CREATE POLICY "authenticated_users_signaling_all" ON signaling
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Desabilitar RLS policies conflitantes em ice_candidates
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ice_select" ON ice_candidates;
DROP POLICY IF EXISTS "ice_insert" ON ice_candidates;
DROP POLICY IF EXISTS "ice_delete" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_select_own" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_insert_own" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_update_own" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_delete_own" ON ice_candidates;
DROP POLICY IF EXISTS "Users can insert ICE candidates for their rooms" ON ice_candidates;
DROP POLICY IF EXISTS "Users can view ICE candidates sent to them" ON ice_candidates;
DROP POLICY IF EXISTS "Users can delete their ICE candidates" ON ice_candidates;
DROP POLICY IF EXISTS "Users can see ICE candidates for their calls" ON ice_candidates;
DROP POLICY IF EXISTS "Users can send ICE candidates" ON ice_candidates;

CREATE POLICY "authenticated_users_ice_all" ON ice_candidates
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
