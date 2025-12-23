-- Add journey_stage column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS journey_stage TEXT;

-- Update the situation column to match new options
UPDATE profiles SET situation = 'Trabalhando em empresa' WHERE situation = 'Trabalhando';
UPDATE profiles SET situation = 'Empreendedor(a)' WHERE situation = 'Empreendedor';
UPDATE profiles SET situation = 'Freelancer/Autônomo' WHERE situation = 'Autônomo';
UPDATE profiles SET situation = 'Estudante' WHERE situation = 'Estudante';
UPDATE profiles SET situation = 'Investidor(a)' WHERE situation = 'Investidor';

-- Comment: The interests and looking_for arrays will remain in the database but won't be mandatory
-- This allows for backwards compatibility and future features
