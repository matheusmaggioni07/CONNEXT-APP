-- Add builder_credits column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS builder_credits integer DEFAULT 20;

-- Update existing users to have 20 credits
UPDATE profiles 
SET builder_credits = 20 
WHERE builder_credits IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.builder_credits IS 'Number of AI generation credits for Connext Builder';
