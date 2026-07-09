-- Remove a restrição atual que só permite 'admin', 'employee' ou 'noc'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adiciona a nova restrição permitindo a nova função 'conferente'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'employee', 'noc', 'conferente'));
