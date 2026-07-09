-- Altera o tipo da coluna unit_id para TEXT para aceitar IDs como "unit-user-..."
ALTER TABLE public.audit_schedules ALTER COLUMN unit_id TYPE TEXT;

-- Altera o tipo da coluna asset_id para TEXT para aceitar IDs como "KINETIC-..."
ALTER TABLE public.audit_progress ALTER COLUMN asset_id TYPE TEXT;
