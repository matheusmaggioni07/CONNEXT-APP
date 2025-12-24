-- Add objectives column to profiles table to support new onboarding flow (ETAPA 4)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS objectives text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN profiles.objectives IS 'User professional objectives selected during onboarding (up to 2): growth, knowledge exchange, showcase work, find investors, build connections';
