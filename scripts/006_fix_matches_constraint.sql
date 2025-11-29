-- Fix the check_and_create_match function to respect the matches_check constraint
-- The constraint requires user1_id < user2_id to avoid duplicate matches

CREATE OR REPLACE FUNCTION check_and_create_match()
RETURNS TRIGGER AS $$
DECLARE
  mutual_like_exists BOOLEAN;
  existing_match_exists BOOLEAN;
  v_user1_id UUID;
  v_user2_id UUID;
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
      -- Ensure user1_id < user2_id to satisfy the check constraint
      IF NEW.from_user_id < NEW.to_user_id THEN
        v_user1_id := NEW.from_user_id;
        v_user2_id := NEW.to_user_id;
      ELSE
        v_user1_id := NEW.to_user_id;
        v_user2_id := NEW.from_user_id;
      END IF;
      
      INSERT INTO matches (user1_id, user2_id)
      VALUES (v_user1_id, v_user2_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION check_and_create_match();
