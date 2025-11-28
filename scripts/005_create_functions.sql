-- Drop and recreate functions with proper error handling

-- Function to handle new user signup - creates profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to increment daily likes count
CREATE OR REPLACE FUNCTION increment_daily_likes(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET daily_likes_count = daily_likes_count + 1,
      last_activity_reset = CASE 
        WHEN last_activity_reset < CURRENT_DATE THEN CURRENT_DATE 
        ELSE last_activity_reset 
      END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment daily calls count
CREATE OR REPLACE FUNCTION increment_daily_calls(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET daily_calls_count = daily_calls_count + 1,
      last_activity_reset = CASE 
        WHEN last_activity_reset < CURRENT_DATE THEN CURRENT_DATE 
        ELSE last_activity_reset 
      END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily limits
CREATE OR REPLACE FUNCTION reset_daily_limits(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET daily_likes_count = 0,
      daily_calls_count = 0,
      last_activity_reset = CURRENT_DATE
  WHERE id = p_user_id AND last_activity_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and create match when mutual like exists
CREATE OR REPLACE FUNCTION check_and_create_match()
RETURNS TRIGGER AS $$
DECLARE
  mutual_like_exists BOOLEAN;
  existing_match_exists BOOLEAN;
BEGIN
  -- Check if mutual like exists
  SELECT EXISTS (
    SELECT 1 FROM likes 
    WHERE from_user_id = NEW.to_user_id 
    AND to_user_id = NEW.from_user_id
  ) INTO mutual_like_exists;
  
  IF mutual_like_exists THEN
    -- Check if match already exists
    SELECT EXISTS (
      SELECT 1 FROM matches 
      WHERE (user1_id = NEW.from_user_id AND user2_id = NEW.to_user_id)
         OR (user1_id = NEW.to_user_id AND user2_id = NEW.from_user_id)
    ) INTO existing_match_exists;
    
    IF NOT existing_match_exists THEN
      INSERT INTO matches (user1_id, user2_id)
      VALUES (NEW.from_user_id, NEW.to_user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic match creation
DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION check_and_create_match();
