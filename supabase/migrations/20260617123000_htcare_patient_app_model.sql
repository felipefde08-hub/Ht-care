-- HTCare patient app model

DO $$
BEGIN
  CREATE TYPE public.diabetes_status AS ENUM ('nao', 'pre_diabetes', 'diabetes', 'nao_sei');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.nivel_atividade AS ENUM ('sedentario', 'leve', 'moderado', 'intenso');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.categoria_risco AS ENUM ('baixo', 'moderado', 'alto');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.assessment_origem AS ENUM ('onboarding', 'checkin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.checkin_humor AS ENUM ('bem', 'cansado', 'mal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS idade INTEGER,
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS fumante BOOLEAN,
  ADD COLUMN IF NOT EXISTS diabetes_status public.diabetes_status DEFAULT 'nao_sei',
  ADD COLUMN IF NOT EXISTS historico_familiar BOOLEAN,
  ADD COLUMN IF NOT EXISTS peso_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS altura_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS nivel_atividade public.nivel_atividade,
  ADD COLUMN IF NOT EXISTS motivo_principal TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  categoria_risco public.categoria_risco NOT NULL,
  fatores_que_pesaram TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  origem public.assessment_origem NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  humor public.checkin_humor NOT NULL,
  sintomas TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  pressao_sistolica NUMERIC,
  pressao_diastolica NUMERIC,
  glicemia NUMERIC,
  peso_kg NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.assessments TO service_role;
GRANT ALL ON public.checkins TO service_role;

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own assessments" ON public.assessments;
CREATE POLICY "Users manage own assessments" ON public.assessments
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own checkins" ON public.checkins;
CREATE POLICY "Users manage own checkins" ON public.checkins
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, clinic_name, professional_name, email, nome)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'clinic_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'professional_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = COALESCE(NULLIF(public.profiles.nome, ''), EXCLUDED.nome);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
