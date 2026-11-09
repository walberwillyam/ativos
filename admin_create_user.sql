-- ==============================================================================
-- Função RPC para Administrador Criar Usuários Diretamente no Banco
-- Permite cadastrar usuários mesmo com 'Email signups are disabled' no Supabase!
-- Execute no SQL Editor do Supabase (ícone >_ no menu lateral)
-- ==============================================================================

-- Habilita extensão pgcrypto para criptografia de senhas (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email TEXT,
  new_password TEXT,
  new_full_name TEXT,
  new_role TEXT DEFAULT 'employee',
  new_unit TEXT DEFAULT NULL
)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- 1. Verifica se quem está executando é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem cadastrar novos usuários.';
  END IF;

  -- 2. Verifica se o e-mail já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(new_email))) THEN
    RAISE EXCEPTION 'Este endereço de e-mail já está cadastrado no sistema.';
  END IF;

  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- 3. Insere na tabela auth.users com e-mail já confirmado e flag de troca obrigatória de senha
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    lower(trim(new_email)),
    encrypted_pw,
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', trim(new_full_name),
      'role', new_role,
      'unit', new_unit,
      'must_change_password', true
    ),
    now(),
    now()
  );

  -- 4. Insere na tabela auth.identities
  BEGIN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id::text,
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', lower(trim(new_email))),
      'email',
      lower(trim(new_email)),
      now(),
      now(),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO auth.identities (
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', lower(trim(new_email))),
        'email',
        lower(trim(new_email)),
        now(),
        now(),
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  -- 5. Insere ou atualiza na tabela pública de perfis
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    unit
  ) VALUES (
    new_user_id,
    lower(trim(new_email)),
    trim(new_full_name),
    new_role,
    new_unit
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    unit = EXCLUDED.unit;

  RETURN jsonb_build_object(
    'id', new_user_id,
    'email', lower(trim(new_email)),
    'full_name', trim(new_full_name)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

