-- Create atomic matching function to prevent race conditions
CREATE OR REPLACE FUNCTION match_video_users(p_user_id UUID)
RETURNS TABLE (
  room_id UUID,
  matched BOOLEAN,
  partner_id UUID
) AS $$
DECLARE
  v_room_id UUID;
  v_partner_id UUID;
  v_matched BOOLEAN;
BEGIN
  -- Lock the video_rooms table to prevent concurrent modifications
  -- Try to find waiting room from another user (atomically)
  SELECT id, user1_id
  INTO v_room_id, v_partner_id
  FROM video_rooms
  WHERE status = 'waiting'
    AND user1_id != p_user_id
    AND user2_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Skip if locked, preventing deadlock

  IF v_room_id IS NOT NULL THEN
    -- Update room atomically to add current user as user2
    UPDATE video_rooms
    SET user2_id = p_user_id,
        status = 'active',
        matched_at = NOW()
    WHERE id = v_room_id
      AND status = 'waiting'
      AND user2_id IS NULL; -- Double-check condition to prevent race

    IF FOUND THEN
      v_matched := TRUE;
      RETURN QUERY SELECT v_room_id, v_matched, v_partner_id;
      RETURN;
    END IF;
  END IF;

  -- No waiting room found, create new waiting room
  INSERT INTO video_rooms (user1_id, status, created_at)
  VALUES (p_user_id, 'waiting', NOW())
  RETURNING video_rooms.id INTO v_room_id;

  v_matched := FALSE;
  RETURN QUERY SELECT v_room_id, v_matched, NULL::UUID;
END;
$$ LANGUAGE plpgsql;

-- Create atomic daily calls increment function
CREATE OR REPLACE FUNCTION increment_daily_calls(p_user_id UUID)
RETURNS TABLE (
  new_count INTEGER
) AS $$
DECLARE
  v_today DATE;
  v_current_count INTEGER;
BEGIN
  -- Get current date in Brazil timezone
  v_today := CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo';

  -- Update or create usage_limits record atomically
  INSERT INTO usage_limits (user_id, date, video_calls_count, created_at, updated_at)
  VALUES (p_user_id, v_today, 1, NOW(), NOW())
  ON CONFLICT (user_id, date) DO UPDATE
  SET video_calls_count = usage_limits.video_calls_count + 1,
      updated_at = NOW()
  RETURNING usage_limits.video_calls_count INTO v_current_count;

  -- Also update profiles for backward compatibility
  UPDATE profiles
  SET daily_calls_count = (
    SELECT COALESCE(SUM(video_calls_count), 0)
    FROM usage_limits
    WHERE user_id = p_user_id AND date = v_today
  ),
  last_activity_reset = v_today
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_current_count;
END;
$$ LANGUAGE plpgsql;

-- Create atomic like increment function
CREATE OR REPLACE FUNCTION increment_daily_likes(p_user_id UUID)
RETURNS TABLE (
  new_count INTEGER
) AS $$
DECLARE
  v_today DATE;
  v_current_count INTEGER;
BEGIN
  v_today := CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo';

  INSERT INTO usage_limits (user_id, date, likes_count, created_at, updated_at)
  VALUES (p_user_id, v_today, 1, NOW(), NOW())
  ON CONFLICT (user_id, date) DO UPDATE
  SET likes_count = usage_limits.likes_count + 1,
      updated_at = NOW()
  RETURNING usage_limits.likes_count INTO v_current_count;

  UPDATE profiles
  SET daily_likes_count = (
    SELECT COALESCE(SUM(likes_count), 0)
    FROM usage_limits
    WHERE user_id = p_user_id AND date = v_today
  ),
  last_activity_reset = v_today
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_current_count;
END;
$$ LANGUAGE plpgsql;

-- Add indexes to prevent full table scans
CREATE INDEX IF NOT EXISTS idx_video_rooms_status_user1_created
ON video_rooms(status, user1_id, created_at) WHERE status = 'waiting' AND user2_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_video_rooms_user_status
ON video_rooms(user1_id, status) INCLUDE (user2_id);

CREATE INDEX IF NOT EXISTS idx_video_rooms_user2_status
ON video_rooms(user2_id, status);

CREATE INDEX IF NOT EXISTS idx_usage_limits_user_date
ON usage_limits(user_id, date);

CREATE INDEX IF NOT EXISTS idx_likes_from_user
ON likes(from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_likes_to_user
ON likes(to_user_id, created_at DESC);

-- Add unique constraint to prevent duplicate entries
ALTER TABLE usage_limits
ADD CONSTRAINT uq_usage_limits_user_date UNIQUE (user_id, date)
ON CONFLICT DO NOTHING;

-- Add NOT NULL constraint to critical fields
ALTER TABLE video_rooms
ALTER COLUMN user1_id SET NOT NULL,
ALTER COLUMN status SET NOT NULL;
