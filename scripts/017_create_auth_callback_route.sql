-- Script SQL para criar rota de callback de autenticação se necessário
-- Este script garante que a tabela de profiles tenha todos os campos necessários

-- Adicionar coluna objectives se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'objectives'
    ) THEN
        ALTER TABLE profiles ADD COLUMN objectives TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Adicionar coluna journey_stage se não existir  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'journey_stage'
    ) THEN
        ALTER TABLE profiles ADD COLUMN journey_stage TEXT;
    END IF;
END $$;

-- Adicionar coluna situation se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'situation'
    ) THEN
        ALTER TABLE profiles ADD COLUMN situation TEXT;
    END IF;
END $$;

COMMENT ON COLUMN profiles.objectives IS 'Array de objetivos do usuário na plataforma (ETAPA 4)';
COMMENT ON COLUMN profiles.journey_stage IS 'Etapa da jornada empreendedora do usuário';
COMMENT ON COLUMN profiles.situation IS 'Situação profissional atual do usuário';
