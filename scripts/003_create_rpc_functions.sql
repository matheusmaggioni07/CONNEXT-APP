-- Function to increment daily likes
CREATE OR REPLACE FUNCTION increment_daily_likes(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET daily_likes_count = daily_likes_count + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment daily calls
CREATE OR REPLACE FUNCTION increment_daily_calls(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET daily_calls_count = daily_calls_count + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
