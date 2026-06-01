-- Crie esta tabela no Supabase (no SQL Editor)
CREATE TABLE public.devices_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  cpu_usage NUMERIC NOT NULL,
  ram_total NUMERIC NOT NULL,
  ram_used NUMERIC NOT NULL,
  disk_total NUMERIC NOT NULL,
  disk_used NUMERIC NOT NULL,
  os_info TEXT NOT NULL,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar RLS (opcional, recomendado para segurança)
ALTER TABLE public.devices_health ENABLE ROW LEVEL SECURITY;

-- Permitir inserts anônimos (para o Agente funcionar com a chave anon)
CREATE POLICY "Allow anonymous inserts on devices_health" 
  ON public.devices_health 
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Permitir selects anônimos (para o Dashboard conseguir ler)
CREATE POLICY "Allow anonymous selects on devices_health" 
  ON public.devices_health 
  FOR SELECT 
  TO anon
  USING (true);

-- Permitir updates anônimos (já que o agente atualiza a mesma linha em vez de criar várias)
CREATE POLICY "Allow anonymous updates on devices_health" 
  ON public.devices_health 
  FOR UPDATE 
  TO anon
  USING (true);

-- Ativar o Realtime para a tabela devices_health
-- Isso fará com que o Supabase avise nosso frontend sempre que houver um UPDATE ou INSERT
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices_health;

-- ====== NOVA ATUALIZAÇÃO: Adicionando colunas de customização ======
-- Rode este comando abaixo caso já tenha criado a tabela anteriormente
ALTER TABLE public.devices_health 
ADD COLUMN IF NOT EXISTS custom_name TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT;
