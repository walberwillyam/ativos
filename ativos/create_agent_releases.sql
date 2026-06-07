-- Tabela para armazenar as versões do agente e o código fonte
CREATE TABLE IF NOT EXISTS public.agent_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    script_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS (Row Level Security)
ALTER TABLE public.agent_releases ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública para que os agentes (usando chave anônima) possam baixar as atualizações
DROP POLICY IF EXISTS "Permitir leitura pública das versões do agente" ON public.agent_releases;
CREATE POLICY "Permitir leitura pública das versões do agente"
ON public.agent_releases
FOR SELECT
USING (true);
