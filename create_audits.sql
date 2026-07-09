-- Criação da tabela de agendamentos de auditoria
CREATE TABLE IF NOT EXISTS public.audit_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'agendado', -- agendado, ativo, concluido
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para salvar o progresso da auditoria (quais itens foram encontrados)
CREATE TABLE IF NOT EXISTS public.audit_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES public.audit_schedules(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL, -- Referência ao ativo conferido
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scanned_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'conferido', -- conferido, nao_localizado, invasor
    notes TEXT
);

-- Habilitar RLS
ALTER TABLE public.audit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_progress ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso - Permitir leitura e escrita para usuários logados (simplificado para o MVP)
DROP POLICY IF EXISTS "Permitir leitura de auditorias" ON public.audit_schedules;
CREATE POLICY "Permitir leitura de auditorias" ON public.audit_schedules FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir modificação de auditorias" ON public.audit_schedules;
CREATE POLICY "Permitir modificação de auditorias" ON public.audit_schedules FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir leitura do progresso" ON public.audit_progress;
CREATE POLICY "Permitir leitura do progresso" ON public.audit_progress FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir modificação do progresso" ON public.audit_progress;
CREATE POLICY "Permitir modificação do progresso" ON public.audit_progress FOR ALL USING (auth.role() = 'authenticated');
