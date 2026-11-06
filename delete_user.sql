-- ==============================================================================
-- Função RPC e Políticas para Excluir Usuários Diretamente pelo Sistema
-- Execute este script no SQL Editor do Supabase (ícone >_ no menu lateral)
-- ==============================================================================

-- 1. Garante permissão de exclusão na tabela public.profiles para admins
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles 
  FOR DELETE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Função RPC para excluir usuário por completo (inclusive do auth.users)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS boolean AS $$
BEGIN
  -- A. Verifica se quem está chamando é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários.';
  END IF;

  -- B. Impede auto-exclusão
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.';
  END IF;

  -- C. Desvincula possíveis auditorias para não violar chaves estrangeiras
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_schedules') THEN
    UPDATE public.audit_schedules SET created_by = NULL WHERE created_by = target_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_progress') THEN
    UPDATE public.audit_progress SET scanned_by = NULL WHERE scanned_by = target_user_id;
  END IF;

  -- D. Exclui da tabela pública de perfis
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- E. Exclui definitivamente da autenticação do Supabase (auth.users)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permite que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated;
