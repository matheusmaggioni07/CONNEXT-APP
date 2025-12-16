-- Criar tabela para rastrear pagamentos PIX
CREATE TABLE IF NOT EXISTS pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- em centavos
  transaction_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT pix_payments_amount_check CHECK (amount > 0)
);

-- Index para buscar pagamentos por usuário
CREATE INDEX idx_pix_payments_user_id ON pix_payments(user_id);
CREATE INDEX idx_pix_payments_status ON pix_payments(status);
CREATE INDEX idx_pix_payments_transaction_id ON pix_payments(transaction_id);

-- RLS policies
ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_pix_payments" ON pix_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_access" ON pix_payments
  USING (auth.role() = 'service_role');
