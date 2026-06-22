-- Patient signup profile fields

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    clinic_name,
    professional_name,
    email,
    nome,
    cpf,
    data_nascimento,
    telefone,
    cidade
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'clinic_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'professional_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'cpf', ''),
    NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::DATE,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'city', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = COALESCE(NULLIF(public.profiles.nome, ''), EXCLUDED.nome),
    cpf = COALESCE(public.profiles.cpf, EXCLUDED.cpf),
    data_nascimento = COALESCE(public.profiles.data_nascimento, EXCLUDED.data_nascimento),
    telefone = COALESCE(public.profiles.telefone, EXCLUDED.telefone),
    cidade = COALESCE(public.profiles.cidade, EXCLUDED.cidade);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
