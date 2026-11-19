-- ==============================================================================
-- Migration: Adicionar coluna avatar_url na tabela public.profiles
-- Permite que a foto de perfil do usuário seja salva e exibida
-- Execute no SQL Editor do Supabase (ícone >_ no menu lateral)
-- ==============================================================================

-- 1. Adiciona a coluna avatar_url caso ainda não exista
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Garante permissão para que os usuários autenticados atualizem sua própria foto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can update own avatar_url'
  ) THEN
    CREATE POLICY "Users can update own avatar_url" ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;
