-- ==============================================================================
-- CORREÇÃO DE PERMISSÕES RLS PARA A TABELA DE TELEMETRIA (devices_health)
-- Permite que usuários autenticados no painel editem nome, setor, unidade e excluam
-- ==============================================================================

-- 1. Habilita permissão de UPDATE para usuários autenticados e anônimos (robô IoT)
DROP POLICY IF EXISTS "Allow all updates on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Enable update for IoT and authenticated" ON public.devices_health;
DROP POLICY IF EXISTS "Allow anonymous updates on devices_health" ON public.devices_health;

CREATE POLICY "Allow all updates on devices_health" 
ON public.devices_health 
FOR UPDATE 
TO public 
USING (true) 
WITH CHECK (true);

-- 2. Habilita permissão de DELETE para usuários autenticados no painel
DROP POLICY IF EXISTS "Allow all deletes on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.devices_health;

CREATE POLICY "Allow all deletes on devices_health" 
ON public.devices_health 
FOR DELETE 
TO public 
USING (true);

-- 3. Garante SELECT aberto para todos
DROP POLICY IF EXISTS "Allow all selects on devices_health" ON public.devices_health;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.devices_health;
DROP POLICY IF EXISTS "Allow anonymous selects on devices_health" ON public.devices_health;

CREATE POLICY "Allow all selects on devices_health" 
ON public.devices_health 
FOR SELECT 
TO public 
USING (true);
