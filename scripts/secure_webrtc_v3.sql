-- Enable RLS on critical WebRTC tables
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;

-- video_rooms RLS policies
CREATE POLICY "video_rooms_users_can_view_own" ON video_rooms
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

CREATE POLICY "video_rooms_users_can_insert" ON video_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

CREATE POLICY "video_rooms_users_can_update_own" ON video_rooms
  FOR UPDATE USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- ice_candidates RLS policies
CREATE POLICY "ice_candidates_users_can_view" ON ice_candidates
  FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

CREATE POLICY "ice_candidates_users_can_insert" ON ice_candidates
  FOR INSERT WITH CHECK (
    auth.uid() = from_user_id
  );

CREATE POLICY "ice_candidates_users_can_delete_own" ON ice_candidates
  FOR DELETE USING (
    auth.uid() = from_user_id
  );

-- signaling RLS policies
CREATE POLICY "signaling_users_can_view" ON signaling
  FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

CREATE POLICY "signaling_users_can_insert" ON signaling
  FOR INSERT WITH CHECK (
    auth.uid() = from_user_id
  );

CREATE POLICY "signaling_users_can_delete_own" ON signaling
  FOR DELETE USING (
    auth.uid() = from_user_id
  );

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_video_rooms_status ON video_rooms(status) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_video_rooms_users ON video_rooms(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_room ON ice_candidates(room_id, processed);
CREATE INDEX IF NOT EXISTS idx_signaling_room ON signaling(room_id, processed);
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_queue(status, user_id);

-- Atomic matching function
CREATE OR REPLACE FUNCTION match_video_users(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_waiting_user UUID;
  v_room_id UUID;
  v_matched_user_id UUID;
BEGIN
  -- Get first waiting user (excluding self)
  SELECT user_id INTO v_waiting_user FROM video_queue
  WHERE status = 'waiting' 
    AND user_id != p_user_id
    AND created_at < NOW() - INTERVAL '1 second'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_waiting_user IS NOT NULL THEN
    -- Create room
    v_room_id := gen_random_uuid();
    
    INSERT INTO video_rooms (id, user1_id, user2_id, status, created_at)
    VALUES (v_room_id, p_user_id, v_waiting_user, 'active', NOW());
    
    -- Update both users in queue
    UPDATE video_queue SET status = 'matched', room_id = v_room_id::text, matched_user_id = v_waiting_user
    WHERE user_id = p_user_id;
    
    UPDATE video_queue SET status = 'matched', room_id = v_room_id::text, matched_user_id = p_user_id
    WHERE user_id = v_waiting_user;
    
    v_matched_user_id := v_waiting_user;
  END IF;
  
  RETURN json_build_object(
    'room_id', v_room_id,
    'matched_user_id', v_matched_user_id,
    'status', CASE WHEN v_matched_user_id IS NOT NULL THEN 'matched' ELSE 'waiting' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment daily calls atomically
CREATE OR REPLACE FUNCTION increment_daily_calls(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO usage_limits (user_id, date, video_calls_count, created_at, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, NOW(), NOW())
  ON CONFLICT (user_id, date) DO UPDATE
  SET video_calls_count = video_calls_count + 1, updated_at = NOW()
  RETURNING video_calls_count INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment daily likes atomically
CREATE OR REPLACE FUNCTION increment_daily_likes(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO usage_limits (user_id, date, likes_count, created_at, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, NOW(), NOW())
  ON CONFLICT (user_id, date) DO UPDATE
  SET likes_count = likes_count + 1, updated_at = NOW()
  RETURNING likes_count INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
