-- Add missing columns to profiles table for usage tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_likes_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_calls_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_reset DATE DEFAULT CURRENT_DATE;

-- Ensure usage_limits table has proper structure and RLS
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  likes_count INT DEFAULT 0,
  video_calls_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on usage_limits if not already enabled
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_limits (drop if exists first to avoid duplicates)
DROP POLICY IF EXISTS "usage_limits_select_own" ON usage_limits;
DROP POLICY IF EXISTS "usage_limits_insert_own" ON usage_limits;
DROP POLICY IF EXISTS "usage_limits_update_own" ON usage_limits;

CREATE POLICY "usage_limits_select_own" ON usage_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_limits_insert_own" ON usage_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usage_limits_update_own" ON usage_limits FOR UPDATE USING (auth.uid() = user_id);
