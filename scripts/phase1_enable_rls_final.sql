-- PHASE 1: Enable RLS on critical tables and remove duplicate policies
-- This is SAFE to run: we enable RLS without FORCE, so existing SELECT queries work
-- We remove duplicate/conflicting policies and create clean, minimal ones

-- ==========================================
-- STEP 1: Enable RLS on video_rooms (NO FORCE)
-- ==========================================
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;

-- Drop old/conflicting policies if any exist
DROP POLICY IF EXISTS "video_rooms_select_own" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_insert_own" ON video_rooms;
DROP POLICY IF EXISTS "video_rooms_update_own" ON video_rooms;

-- Create clean policies for video_rooms
CREATE POLICY "video_rooms_users_can_view_own" ON video_rooms
FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "video_rooms_system_creates_rooms" ON video_rooms
FOR INSERT WITH CHECK (
  (user1_id = auth.uid() OR user2_id = auth.uid()) OR
  auth.role() = 'service_role'
);

CREATE POLICY "video_rooms_users_can_update_own" ON video_rooms
FOR UPDATE USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
) WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- ==========================================
-- STEP 2: Enable RLS on ice_candidates (NO FORCE)
-- ==========================================
ALTER TABLE ice_candidates ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "ice_candidates_select_own" ON ice_candidates;
DROP POLICY IF EXISTS "ice_candidates_insert_own" ON ice_candidates;

-- Create clean policies
CREATE POLICY "ice_candidates_users_can_view_own" ON ice_candidates
FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);

CREATE POLICY "ice_candidates_users_can_insert_own" ON ice_candidates
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id
);

-- ==========================================
-- STEP 3: Enable RLS on signaling (NO FORCE)
-- ==========================================
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "signaling_select_own" ON signaling;
DROP POLICY IF EXISTS "signaling_insert_own" ON signaling;

-- Create clean policies
CREATE POLICY "signaling_users_can_view_own" ON signaling
FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);

CREATE POLICY "signaling_users_can_insert_own" ON signaling
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id
);

-- ==========================================
-- STEP 4: Enable RLS on video_queue (NO FORCE)
-- ==========================================
ALTER TABLE video_queue ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "video_queue_users_can_see_own" ON video_queue;
DROP POLICY IF EXISTS "video_queue_users_can_insert_own" ON video_queue;
DROP POLICY IF EXISTS "video_queue_users_can_update_own" ON video_queue;
DROP POLICY IF EXISTS "video_queue_users_can_delete_own" ON video_queue;

-- Create clean policies
CREATE POLICY "video_queue_users_view_own" ON video_queue
FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "video_queue_users_insert_own" ON video_queue
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "video_queue_users_update_own" ON video_queue
FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "video_queue_users_delete_own" ON video_queue
FOR DELETE USING (
  auth.uid() = user_id
);

-- ==========================================
-- STEP 5: Enable RLS on profiles (NO FORCE)
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old/duplicate policies
DROP POLICY IF EXISTS "profiles_select_all_users" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- Create clean policies
CREATE POLICY "profiles_view_own" ON profiles
FOR SELECT USING (
  auth.uid() = id
);

CREATE POLICY "profiles_view_all_for_discovery" ON profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND id != auth.uid()
);

CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "profiles_delete_own" ON profiles
FOR DELETE USING (
  auth.uid() = id
);

-- ==========================================
-- STEP 6: Clean duplicate policies from likes
-- ==========================================
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
DROP POLICY IF EXISTS "likes_delete_own" ON likes;
DROP POLICY IF EXISTS "likes_select_own" ON likes;
DROP POLICY IF EXISTS "likes_select" ON likes;
DROP POLICY IF EXISTS "likes_insert" ON likes;

-- Keep ONLY these policies for likes
CREATE POLICY "likes_view_own" ON likes
FOR SELECT USING (
  auth.uid() = from_user_id
);

CREATE POLICY "likes_insert_own" ON likes
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id
);

CREATE POLICY "likes_delete_own" ON likes
FOR DELETE USING (
  auth.uid() = from_user_id
);

-- ==========================================
-- STEP 7: Clean duplicate policies from matches
-- ==========================================
DROP POLICY IF EXISTS "matches_select" ON matches;
DROP POLICY IF EXISTS "matches_select_own" ON matches;
DROP POLICY IF EXISTS "matches_insert_system" ON matches;
DROP POLICY IF EXISTS "matches_delete_own" ON matches;

-- Keep ONLY these policies for matches
CREATE POLICY "matches_view_own" ON matches
FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "matches_insert_own" ON matches
FOR INSERT WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id OR
  auth.role() = 'service_role'
);

CREATE POLICY "matches_delete_own" ON matches
FOR DELETE USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- ==========================================
-- STEP 8: Create critical indexes for performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_video_rooms_users ON video_rooms(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_status ON video_rooms(status);
CREATE INDEX IF NOT EXISTS idx_video_queue_user ON video_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_queue(status);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_room ON ice_candidates(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_room ON signaling(room_id);
CREATE INDEX IF NOT EXISTS idx_likes_from_to ON likes(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ==========================================
-- STEP 9: Grant proper permissions
-- ==========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
