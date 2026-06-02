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

-- ====== NOVO ESQUEMA: ATIVOS E UNIDADES (EXECUTE TUDO ABAIXO) ======

CREATE TABLE public.units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  manager TEXT NOT NULL,
  email TEXT NOT NULL,
  partitions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous selects on units" ON public.units FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous inserts on units" ON public.units FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous updates on units" ON public.units FOR UPDATE TO anon USING (true);

CREATE TABLE public.assets (
  id TEXT PRIMARY KEY,
  patrimonio TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  model TEXT NOT NULL,
  serialNumber TEXT NOT NULL,
  unit TEXT NOT NULL,
  location TEXT NOT NULL,
  currentFloor TEXT NOT NULL,
  mapCoordinates JSONB NOT NULL DEFAULT '{"x":50,"y":50}'::jsonb,
  responsible JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  value NUMERIC NOT NULL,
  acquisitionDate TEXT NOT NULL,
  warrantyExpiry TEXT NOT NULL,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  imageUrl TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous selects on assets" ON public.assets FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous inserts on assets" ON public.assets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous updates on assets" ON public.assets FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anonymous deletes on assets" ON public.assets FOR DELETE TO anon USING (true);

CREATE TABLE public.activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  by_user TEXT NOT NULL,
  icon TEXT NOT NULL,
  badgeColor TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous selects on activities" ON public.activities FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous inserts on activities" ON public.activities FOR INSERT TO anon WITH CHECK (true);

