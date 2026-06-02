-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.categories
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.categories
    FOR DELETE USING (true);

-- Dados Iniciais (inserir apenas se a tabela estiver vazia)
INSERT INTO public.categories (name, description, icon)
VALUES 
    ('Notebooks', 'Equipamentos corporativos de uso flexível', 'Laptop'),
    ('Monitores', 'Telas administrativas de alta resolução', 'Monitor'),
    ('Impressoras', 'Impressão e cópia patrimoniais', 'Printer'),
    ('Switches', 'Hardware de infraestrutura e roteamento', 'Cpu'),
    ('Hardware de Rede', 'Roteadores e APs', 'Wifi'),
    ('Mobiliário', 'Mesas, cadeiras, etc.', 'Archive')
ON CONFLICT (name) DO NOTHING;
