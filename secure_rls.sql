-- 🛡️ Aplicação de Segurança Global (RLS Seguro)
-- Este script substitui as permissões anônimas abertas por políticas restritas a usuários autenticados (JWT).
-- O Agente IoT manterá suas permissões exclusivas na tabela devices_health.

-- ==========================================
-- 1. Remoção das Políticas Antigas Inseguras
-- ==========================================
DROP POLICY IF EXISTS "Allow all selects on units" ON public.units;
DROP POLICY IF EXISTS "Allow all inserts on units" ON public.units;
DROP POLICY IF EXISTS "Allow all updates on units" ON public.units;
DROP POLICY IF EXISTS "Allow anonymous selects on units" ON public.units;
DROP POLICY IF EXISTS "Allow anonymous inserts on units" ON public.units;
DROP POLICY IF EXISTS "Allow anonymous updates on units" ON public.units;

DROP POLICY IF EXISTS "Allow all selects on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow all inserts on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow all updates on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow all deletes on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow anonymous selects on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow anonymous inserts on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow anonymous updates on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow anonymous deletes on assets" ON public.assets;

DROP POLICY IF EXISTS "Allow all selects on activities" ON public.activities;
DROP POLICY IF EXISTS "Allow all inserts on activities" ON public.activities;
DROP POLICY IF EXISTS "Allow anonymous selects on activities" ON public.activities;
DROP POLICY IF EXISTS "Allow anonymous inserts on activities" ON public.activities;

DROP POLICY IF EXISTS "Allow all selects on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Allow all inserts on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Allow all updates on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Allow anonymous selects on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Allow anonymous inserts on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Allow anonymous updates on devices_health" ON public.devices_health;

-- ==========================================
-- 2. Criação das Novas Políticas Seguras
-- ==========================================

-- TABELA UNITS (Apenas Autenticados)
CREATE POLICY "Enable read access for authenticated users" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.units FOR UPDATE TO authenticated USING (true);

-- TABELA ASSETS (Apenas Autenticados)
CREATE POLICY "Enable read access for authenticated users" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated admins" ON public.assets FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- TABELA ACTIVITIES (Apenas Autenticados)
CREATE POLICY "Enable read access for authenticated users" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);

-- TABELA DEVICES_HEALTH (Misto: IoT usa 'anon', App usa 'authenticated')
-- Permite leitura apenas para autenticados
CREATE POLICY "Enable read access for authenticated users" ON public.devices_health FOR SELECT TO authenticated USING (true);
-- Permite que o agente IoT envie novos pings usando a chave anônima (ou autenticados)
CREATE POLICY "Enable insert for IoT and authenticated" ON public.devices_health FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Permite que o agente IoT atualize registros usando a chave anônima (ou autenticados)
CREATE POLICY "Enable update for IoT and authenticated" ON public.devices_health FOR UPDATE TO anon, authenticated USING (true);

-- ==========================================
-- 3. Habilitar RLS em todas as tabelas
-- ==========================================
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices_health ENABLE ROW LEVEL SECURITY;
