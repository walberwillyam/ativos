-- Dropar as policies antigas das tabelas principais
DROP POLICY IF EXISTS "Allow anonymous selects on units" ON public.units;
DROP POLICY IF EXISTS "Allow anonymous inserts on units" ON public.units;
DROP POLICY IF EXISTS "Allow anonymous updates on units" ON public.units;

DROP POLICY IF EXISTS "Allow anonymous selects on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow anonymous inserts on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow anonymous updates on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow anonymous deletes on assets" ON public.assets;

DROP POLICY IF EXISTS "Allow anonymous selects on activities" ON public.activities;
DROP POLICY IF EXISTS "Allow anonymous inserts on activities" ON public.activities;

DROP POLICY IF EXISTS "Allow anonymous inserts on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Allow anonymous selects on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Allow anonymous updates on devices_health" ON public.devices_health;

-- Criar novas policies que aceitam tanto usuários deslogados (anon) quanto logados (authenticated)
-- UNITS
CREATE POLICY "Allow all selects on units" ON public.units FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all inserts on units" ON public.units FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow all updates on units" ON public.units FOR UPDATE TO anon, authenticated USING (true);

-- ASSETS
CREATE POLICY "Allow all selects on assets" ON public.assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all inserts on assets" ON public.assets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow all updates on assets" ON public.assets FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow all deletes on assets" ON public.assets FOR DELETE TO anon, authenticated USING (true);

-- ACTIVITIES
CREATE POLICY "Allow all selects on activities" ON public.activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all inserts on activities" ON public.activities FOR INSERT TO anon, authenticated WITH CHECK (true);

-- DEVICES_HEALTH
CREATE POLICY "Allow all selects on devices_health" ON public.devices_health FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all inserts on devices_health" ON public.devices_health FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow all updates on devices_health" ON public.devices_health FOR UPDATE TO anon, authenticated USING (true);
