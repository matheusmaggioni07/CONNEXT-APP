-- ====== ENABLE RLS ON ALL CRITICAL TABLES ======

-- 1. PROFILES TABLE - Enable RLS
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop conflicting old policies
DROP POLICY IF EXISTS "profiles_select_all_users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Create clean, non-conflicting policies
CREATE POLICY "users_can_view_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_can_view_all_profiles"
  ON public.profiles FOR SELECT
  USING (true); -- Allow public profile viewing for discovery

CREATE POLICY "users_can_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_delete_own_profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

CREATE POLICY "service_role_full_access"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. VIDEO_ROOMS - Enable RLS and create secure policies
ALTER TABLE IF EXISTS public.video_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_rooms_select_own" ON public.video_rooms;
DROP POLICY IF EXISTS "video_rooms_insert_own" ON public.video_rooms;
DROP POLICY IF EXISTS "video_rooms_update_own" ON public.video_rooms;

CREATE POLICY "users_can_view_own_rooms"
  ON public.video_rooms FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "users_can_create_rooms"
  ON public.video_rooms FOR INSERT
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "users_can_update_own_rooms"
  ON public.video_rooms FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 3. ICE_CANDIDATES - Enable RLS
ALTER TABLE IF EXISTS public.ice_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_candidates"
  ON public.ice_candidates FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "users_can_insert_candidates"
  ON public.ice_candidates FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "users_can_delete_own_candidates"
  ON public.ice_candidates FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 4. SIGNALING - Enable RLS
ALTER TABLE IF EXISTS public.signaling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_signaling"
  ON public.signaling FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "users_can_insert_signaling"
  ON public.signaling FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "users_can_delete_own_signaling"
  ON public.signaling FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 5. VIDEO_QUEUE - Enable RLS (already has policies but rewrite them for clarity)
ALTER TABLE IF EXISTS public.video_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own queue entries" ON public.video_queue;
DROP POLICY IF EXISTS "Users can update their queue entries" ON public.video_queue;
DROP POLICY IF EXISTS "Users can delete their queue entries" ON public.video_queue;
DROP POLICY IF EXISTS "Users can create queue entries" ON public.video_queue;

CREATE POLICY "users_can_view_own_queue"
  ON public.video_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_queue"
  ON public.video_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_queue"
  ON public.video_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_queue"
  ON public.video_queue FOR DELETE
  USING (auth.uid() = user_id);

-- 6. LIKES - Clean up duplicate policies
ALTER TABLE IF EXISTS public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can view their likes" ON public.likes;
DROP POLICY IF EXISTS "likes_delete_own" ON public.likes;
DROP POLICY IF EXISTS "likes_select_own" ON public.likes;
DROP POLICY IF EXISTS "likes_select" ON public.likes;
DROP POLICY IF EXISTS "likes_insert" ON public.likes;

CREATE POLICY "users_can_view_own_likes"
  ON public.likes FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "users_can_insert_likes"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "users_can_delete_own_likes"
  ON public.likes FOR DELETE
  USING (auth.uid() = from_user_id);

-- 7. MATCHES - Clean up duplicate policies
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select" ON public.matches;
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
DROP POLICY IF EXISTS "matches_delete_own" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_system" ON public.matches;
DROP POLICY IF EXISTS "matches_select_own" ON public.matches;
DROP POLICY IF EXISTS "Users can view their matches" ON public.matches;

CREATE POLICY "users_can_view_own_matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "users_can_insert_matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "users_can_delete_own_matches"
  ON public.matches FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ====== CREATE INDEXES FOR PERFORMANCE ======

CREATE INDEX IF NOT EXISTS idx_video_rooms_user1 ON public.video_rooms(user1_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_user2 ON public.video_rooms(user2_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_status ON public.video_rooms(status);

CREATE INDEX IF NOT EXISTS idx_ice_candidates_room ON public.ice_candidates(room_id);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_from_to ON public.ice_candidates(from_user_id, to_user_id);

CREATE INDEX IF NOT EXISTS idx_signaling_room ON public.signaling(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_from_to ON public.signaling(from_user_id, to_user_id);

CREATE INDEX IF NOT EXISTS idx_video_queue_user ON public.video_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON public.video_queue(status);

CREATE INDEX IF NOT EXISTS idx_likes_from_to ON public.likes(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to ON public.likes(to_user_id);

CREATE INDEX IF EXISTS idx_matches_users ON public.matches(user1_id, user2_id);

-- ====== VERIFY RLS IS ENABLED ======

SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'video_rooms', 'ice_candidates', 'signaling', 'video_queue', 'likes', 'matches');
