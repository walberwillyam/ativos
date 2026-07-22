-- Corrigir permissões da tabela os_licenses para permitir usuários autenticados (painel) e anônimos (agente)

-- Remover as políticas antigas (caso existam)
DROP POLICY IF EXISTS "Allow anonymous selects on os_licenses" ON public.os_licenses;
DROP POLICY IF EXISTS "Allow anonymous inserts on os_licenses" ON public.os_licenses;
DROP POLICY IF EXISTS "Allow anonymous updates on os_licenses" ON public.os_licenses;
DROP POLICY IF EXISTS "Allow anonymous deletes on os_licenses" ON public.os_licenses;

-- Criar novas políticas abertas para 'public' (que abrange anon e authenticated)
CREATE POLICY "Allow public selects on os_licenses" 
    ON public.os_licenses 
    FOR SELECT 
    TO public
    USING (true);

CREATE POLICY "Allow public inserts on os_licenses" 
    ON public.os_licenses 
    FOR INSERT 
    TO public
    WITH CHECK (true);

CREATE POLICY "Allow public updates on os_licenses" 
    ON public.os_licenses 
    FOR UPDATE 
    TO public
    USING (true);

CREATE POLICY "Allow public deletes on os_licenses" 
    ON public.os_licenses 
    FOR DELETE 
    TO public
    USING (true);
