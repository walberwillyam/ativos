-- ==============================================================================
-- Script para Auto-Confirmar Usuários Criados pelo Gestor
-- Execute este script no SQL Editor do Supabase (ícone >_ no menu lateral)
-- ==============================================================================

-- 1. Confirmar imediatamente todos os usuários existentes que estão com e-mail pendente (ex: Jean Freitas)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 2. Criar função para auto-confirmar novos usuários cadastrados no banco
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger BEFORE INSERT para garantir que qualquer usuário inserido já nasça confirmado
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_confirm_user();

-- 4. Função RPC para confirmar e-mail por chamada direta da aplicação
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_email text)
RETURNS boolean AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE lower(email) = lower(user_email);
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.confirm_user_email(text) TO authenticated, anon, service_role;
