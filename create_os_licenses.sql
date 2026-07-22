-- Criar tabela de licenças do sistema operacional
CREATE TABLE public.os_licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_key TEXT UNIQUE NOT NULL,
    asset_id TEXT REFERENCES public.assets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.os_licenses ENABLE ROW LEVEL SECURITY;

-- Permitir leitura anônima (agente e painel podem ler)
CREATE POLICY "Allow anonymous selects on os_licenses" 
    ON public.os_licenses 
    FOR SELECT 
    TO anon
    USING (true);

-- Permitir inserção anônima (para adicionar em lote via painel)
CREATE POLICY "Allow anonymous inserts on os_licenses" 
    ON public.os_licenses 
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Permitir update anônimo (agente vai vincular seu próprio asset_id)
CREATE POLICY "Allow anonymous updates on os_licenses" 
    ON public.os_licenses 
    FOR UPDATE 
    TO anon
    USING (true);

-- Permitir delete anônimo (para o painel remover chaves não utilizadas)
CREATE POLICY "Allow anonymous deletes on os_licenses" 
    ON public.os_licenses 
    FOR DELETE 
    TO anon
    USING (true);

-- Ativar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.os_licenses;
