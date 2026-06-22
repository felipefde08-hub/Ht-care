-- HTCare cardiology schema

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  clinic_name TEXT NOT NULL DEFAULT '',
  professional_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  phone TEXT,
  guardian TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cardio_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  systolic NUMERIC NOT NULL,
  diastolic NUMERIC NOT NULL,
  heart_rate NUMERIC NOT NULL,
  medication_adherence NUMERIC NOT NULL,
  activity NUMERIC NOT NULL,
  weight NUMERIC,
  symptoms NUMERIC NOT NULL,
  exams_pending NUMERIC NOT NULL DEFAULT 0,
  smoking BOOLEAN NOT NULL DEFAULT false,
  diabetes BOOLEAN NOT NULL DEFAULT false,
  cholesterol BOOLEAN NOT NULL DEFAULT false,
  hypertension BOOLEAN NOT NULL DEFAULT false,
  family_history BOOLEAN NOT NULL DEFAULT false,
  clinical_notes TEXT,
  score_pressure NUMERIC NOT NULL,
  score_adherence NUMERIC NOT NULL,
  score_metabolic NUMERIC NOT NULL,
  score_habits NUMERIC NOT NULL,
  score_symptoms NUMERIC NOT NULL,
  heart_score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.clinic_professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'professional' CHECK (role IN ('admin', 'professional')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('active', 'invited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardio_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_professionals TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.patients TO service_role;
GRANT ALL ON public.cardio_logs TO service_role;
GRANT ALL ON public.clinic_professionals TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON public.profiles
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own patients" ON public.patients
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own cardio logs" ON public.cardio_logs
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own professionals" ON public.clinic_professionals
FOR ALL USING (auth.uid() = clinic_id) WITH CHECK (auth.uid() = clinic_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_patients_updated
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, clinic_name, professional_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'clinic_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'professional_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
