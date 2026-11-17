-- ==============================================================================
-- Migration: Adicionar coluna signature na tabela public.profiles
-- Permite que a assinatura padrão do técnico seja persistida no banco de dados
-- e sincronizada entre celular, computador e qualquer outro dispositivo.
-- Execute no SQL Editor do Supabase (ícone >_ no menu lateral)
-- ==============================================================================

-- 1. Adiciona a coluna signature se ainda não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature text;

-- 2. Garante permissão para que os usuários atualizem sua própria assinatura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can update own profile signature'
  ) THEN
    CREATE POLICY "Users can update own profile signature" ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

