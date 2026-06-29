-- HTCare production schema
-- Run this once in Supabase SQL Editor for the production project.
-- Goal: prevent "relation does not exist" for the MVP flow:
-- signup -> profile -> assessment -> upload exam -> exam_result -> feedback.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.diabetes_status as enum ('nao', 'pre_diabetes', 'diabetes', 'nao_sei');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.nivel_atividade as enum ('sedentario', 'leve', 'moderado', 'intenso');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.categoria_risco as enum ('baixo', 'moderado', 'alto');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.assessment_origem as enum ('onboarding', 'checkin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.checkin_humor as enum ('bem', 'cansado', 'mal');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.exam_request_status as enum (
    'aguardando_autorizacao',
    'aguardando_medico',
    'autorizado',
    'recusado',
    'resultado_recebido',
    'concluido'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typname = 'exam_request_status') then
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.exam_request_status'::regtype
        and enumlabel = 'aguardando_medico'
    ) then
      alter type public.exam_request_status add value 'aguardando_medico';
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

revoke execute on function public.update_updated_at_column() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Core user profile
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_name text not null default '',
  professional_name text not null default '',
  email text not null default '',
  nome text,
  cpf text,
  data_nascimento date,
  telefone text,
  cidade text,
  avatar_url text,
  idade integer,
  sexo text,
  fumante boolean,
  diabetes_status public.diabetes_status default 'nao_sei',
  historico_familiar boolean,
  peso_kg numeric,
  altura_cm numeric,
  nivel_atividade public.nivel_atividade,
  motivo_principal text[] default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists clinic_name text not null default '',
  add column if not exists professional_name text not null default '',
  add column if not exists email text not null default '',
  add column if not exists nome text,
  add column if not exists cpf text,
  add column if not exists data_nascimento date,
  add column if not exists telefone text,
  add column if not exists cidade text,
  add column if not exists avatar_url text,
  add column if not exists idade integer,
  add column if not exists sexo text,
  add column if not exists fumante boolean,
  add column if not exists diabetes_status public.diabetes_status default 'nao_sei',
  add column if not exists historico_familiar boolean,
  add column if not exists peso_kg numeric,
  add column if not exists altura_cm numeric,
  add column if not exists nivel_atividade public.nivel_atividade,
  add column if not exists motivo_principal text[] default array[]::text[],
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger as $$
declare
  safe_birth_date date;
begin
  begin
    safe_birth_date := nullif(new.raw_user_meta_data->>'birth_date', '')::date;
  exception when others then
    safe_birth_date := null;
  end;

  insert into public.profiles (
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
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'clinic_name', ''),
    coalesce(new.raw_user_meta_data->>'professional_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), ''),
    safe_birth_date,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'city', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    nome = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
    cpf = coalesce(public.profiles.cpf, excluded.cpf),
    data_nascimento = coalesce(public.profiles.data_nascimento, excluded.data_nascimento),
    telefone = coalesce(public.profiles.telefone, excluded.telefone),
    cidade = coalesce(public.profiles.cidade, excluded.cidade);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Assessments and check-ins
-- ---------------------------------------------------------------------------

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric not null,
  categoria_risco public.categoria_risco not null,
  fatores_que_pesaram text[] not null default array[]::text[],
  origem public.assessment_origem not null,
  created_at timestamptz not null default now()
);

create index if not exists assessments_user_created_idx
on public.assessments (user_id, created_at desc);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  humor public.checkin_humor not null,
  sintomas text[] not null default array[]::text[],
  pressao_sistolica numeric,
  pressao_diastolica numeric,
  glicemia numeric,
  peso_kg numeric,
  created_at timestamptz not null default now()
);

create index if not exists checkins_user_created_idx
on public.checkins (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Doctors and exam request flow
-- ---------------------------------------------------------------------------

create table if not exists public.medico_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  crm text,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.exam_request_status not null default 'aguardando_autorizacao',
  nome text,
  cidade text,
  telefone_whatsapp text,
  plano_saude text,
  score_atual integer,
  fatores_risco text[],
  medico_id uuid references public.medico_profiles(id) on delete set null,
  observacao_medico text,
  requisicao_url text,
  requisicao_path text,
  resultado_url text,
  resultado_path text,
  nota_medico text,
  laboratorio_nome text,
  laboratorio_endereco text,
  laboratorio_telefone text,
  authorized_at timestamptz,
  resultado_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exam_requests
  add column if not exists nome text,
  add column if not exists cidade text,
  add column if not exists telefone_whatsapp text,
  add column if not exists plano_saude text,
  add column if not exists score_atual integer,
  add column if not exists fatores_risco text[],
  add column if not exists requisicao_url text,
  add column if not exists requisicao_path text,
  add column if not exists resultado_url text,
  add column if not exists resultado_path text,
  add column if not exists nota_medico text,
  add column if not exists laboratorio_nome text,
  add column if not exists laboratorio_endereco text,
  add column if not exists laboratorio_telefone text,
  add column if not exists authorized_at timestamptz,
  add column if not exists resultado_received_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.exam_requests
  alter column cidade drop not null,
  alter column telefone_whatsapp drop not null;

drop trigger if exists trg_exam_requests_updated on public.exam_requests;
create trigger trg_exam_requests_updated
before update on public.exam_requests
for each row execute function public.update_updated_at_column();

create index if not exists exam_requests_user_created_idx
on public.exam_requests (user_id, created_at desc);

create index if not exists exam_requests_status_created_idx
on public.exam_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Exam uploads and interpreted results
-- ---------------------------------------------------------------------------

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exam_date date,
  notes text,
  file_url text,
  file_path text,
  file_type text,
  created_at timestamptz not null default now()
);

create index if not exists exams_user_created_idx
on public.exams (user_id, created_at desc);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exam_request_id uuid references public.exam_requests(id) on delete set null,
  laboratorio_nome text,
  data_exame date not null default current_date,
  arquivo_url text,
  apob numeric,
  ldl numeric,
  hdl numeric,
  triglicerideos numeric,
  hba1c numeric,
  glicemia_jejum numeric,
  insulina_jejum numeric,
  homa_ir numeric,
  pcr_us numeric,
  score_estimado numeric,
  score_calculado numeric not null,
  categoria_risco text check (categoria_risco in ('baixo', 'moderado', 'alto')),
  interpretacao_gerada jsonb not null default '{}'::jsonb,
  resumo_carelito text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_exam_results_updated on public.exam_results;
create trigger trg_exam_results_updated
before update on public.exam_results
for each row execute function public.update_updated_at_column();

create index if not exists exam_results_user_created_idx
on public.exam_results (user_id, created_at desc);

create index if not exists exam_results_request_idx
on public.exam_results (exam_request_id);

-- ---------------------------------------------------------------------------
-- Profile features: medications, notifications and feedbacks
-- ---------------------------------------------------------------------------

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'outro',
  description text not null,
  dose text,
  schedule_times text[] not null default array[]::text[],
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists medications_user_created_idx
on public.medications (user_id, created_at desc);

create table if not exists public.medication_adherence_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  log_date date not null default current_date,
  taken_at timestamptz not null default now(),
  unique (user_id, medication_id, log_date)
);

create index if not exists medication_adherence_user_month_idx
on public.medication_adherence_logs (user_id, log_date desc);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_checkin boolean not null default true,
  weekly_summary_email boolean not null default false,
  new_mission boolean not null default true,
  achievement_unlocked boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'general',
  route text,
  score numeric,
  answer text,
  feedback text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feedbacks_user_created_idx
on public.feedbacks (user_id, created_at desc);

create index if not exists feedbacks_kind_created_idx
on public.feedbacks (kind, created_at desc);

-- ---------------------------------------------------------------------------
-- App support tables used by current frontend
-- ---------------------------------------------------------------------------

create table if not exists public.onboarding_chat_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  step integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  skipped boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.carelito_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists carelito_messages_user_created_idx
on public.carelito_conversations (user_id, created_at asc);

create table if not exists public.user_activity_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  actions text[] not null default '{}',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create index if not exists user_activity_days_user_month_idx
on public.user_activity_days (user_id, activity_date desc);

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  points integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_events_user_created_idx
on public.user_activity_events (user_id, created_at desc);

create table if not exists public.lab_exam_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text not null,
  cidade text not null,
  plano_saude text,
  source text not null default 'home',
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

create index if not exists lab_exam_interests_user_created_idx
on public.lab_exam_interests (user_id, created_at desc);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tomou_medicamentos boolean,
  bebeu_agua boolean,
  movimentou boolean,
  humor text check (humor in ('feliz', 'neutro', 'triste')),
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists daily_checkins_user_created_idx
on public.daily_checkins (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.checkins enable row level security;
alter table public.medico_profiles enable row level security;
alter table public.exam_requests enable row level security;
alter table public.exams enable row level security;
alter table public.exam_results enable row level security;
alter table public.medications enable row level security;
alter table public.medication_adherence_logs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.feedbacks enable row level security;
alter table public.onboarding_chat_progress enable row level security;
alter table public.carelito_conversations enable row level security;
alter table public.user_activity_days enable row level security;
alter table public.user_activity_events enable row level security;
alter table public.lab_exam_interests enable row level security;
alter table public.daily_checkins enable row level security;

-- profiles
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
on public.profiles
for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Doctors can read patient profiles" on public.profiles;
create policy "Doctors can read patient profiles"
on public.profiles
for select
to authenticated
using (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()));

-- assessments
drop policy if exists "Users manage own assessments" on public.assessments;
create policy "Users manage own assessments"
on public.assessments
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Doctors can read patient assessments" on public.assessments;
create policy "Doctors can read patient assessments"
on public.assessments
for select
to authenticated
using (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()));

-- checkins
drop policy if exists "Users manage own checkins" on public.checkins;
create policy "Users manage own checkins"
on public.checkins
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- doctors
drop policy if exists "Doctors can read own medico profile" on public.medico_profiles;
create policy "Doctors can read own medico profile"
on public.medico_profiles
for select
to authenticated
using (auth.uid() = id);

-- exam_requests
drop policy if exists "Users can create own exam requests" on public.exam_requests;
create policy "Users can create own exam requests"
on public.exam_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own exam requests" on public.exam_requests;
create policy "Users can read own exam requests"
on public.exam_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update result of own authorized exam request" on public.exam_requests;
create policy "Users can update result of own authorized exam request"
on public.exam_requests
for update
to authenticated
using (auth.uid() = user_id and status in ('autorizado', 'resultado_recebido', 'concluido'))
with check (auth.uid() = user_id and status in ('autorizado', 'resultado_recebido', 'concluido'));

drop policy if exists "Doctors can read exam requests" on public.exam_requests;
create policy "Doctors can read exam requests"
on public.exam_requests
for select
to authenticated
using (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()));

drop policy if exists "Doctors can update exam requests" on public.exam_requests;
create policy "Doctors can update exam requests"
on public.exam_requests
for update
to authenticated
using (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()))
with check (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()));

-- exams
drop policy if exists "Users can read own exams" on public.exams;
create policy "Users can read own exams"
on public.exams
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own exams" on public.exams;
create policy "Users can insert own exams"
on public.exams
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own exams" on public.exams;
create policy "Users can delete own exams"
on public.exams
for delete
to authenticated
using (auth.uid() = user_id);

-- exam_results
drop policy if exists "Users can read own exam results" on public.exam_results;
create policy "Users can read own exam results"
on public.exam_results
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own exam results" on public.exam_results;
create policy "Users can create own exam results"
on public.exam_results
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own exam results" on public.exam_results;
create policy "Users can update own exam results"
on public.exam_results
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Doctors can read exam results" on public.exam_results;
create policy "Doctors can read exam results"
on public.exam_results
for select
to authenticated
using (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()));

-- medications
drop policy if exists "Users can read own medications" on public.medications;
create policy "Users can read own medications"
on public.medications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own medications" on public.medications;
create policy "Users can insert own medications"
on public.medications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own medications" on public.medications;
create policy "Users can delete own medications"
on public.medications
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own medication adherence" on public.medication_adherence_logs;
create policy "Users can read own medication adherence"
on public.medication_adherence_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own medication adherence" on public.medication_adherence_logs;
create policy "Users can insert own medication adherence"
on public.medication_adherence_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- notification_preferences
drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
create policy "Users can read own notification preferences"
on public.notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
create policy "Users can insert own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
on public.notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- feedbacks
drop policy if exists "Users can insert own feedbacks" on public.feedbacks;
create policy "Users can insert own feedbacks"
on public.feedbacks
for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can read own feedbacks" on public.feedbacks;
create policy "Users can read own feedbacks"
on public.feedbacks
for select
to authenticated
using (auth.uid() = user_id);

-- app support
drop policy if exists "Users can read own onboarding chat progress" on public.onboarding_chat_progress;
create policy "Users can read own onboarding chat progress"
on public.onboarding_chat_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can upsert own onboarding chat progress" on public.onboarding_chat_progress;
create policy "Users can upsert own onboarding chat progress"
on public.onboarding_chat_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own onboarding chat progress" on public.onboarding_chat_progress;
create policy "Users can update own onboarding chat progress"
on public.onboarding_chat_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own carelito messages" on public.carelito_conversations;
create policy "Users can read own carelito messages"
on public.carelito_conversations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own carelito messages" on public.carelito_conversations;
create policy "Users can insert own carelito messages"
on public.carelito_conversations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own activity days" on public.user_activity_days;
create policy "Users can read own activity days"
on public.user_activity_days
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity days" on public.user_activity_days;
create policy "Users can insert own activity days"
on public.user_activity_days
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own activity days" on public.user_activity_days;
create policy "Users can update own activity days"
on public.user_activity_days
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own activity events" on public.user_activity_events;
create policy "Users can read own activity events"
on public.user_activity_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity events" on public.user_activity_events;
create policy "Users can insert own activity events"
on public.user_activity_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can insert own lab exam interests" on public.lab_exam_interests;
create policy "Users can insert own lab exam interests"
on public.lab_exam_interests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own lab exam interests" on public.lab_exam_interests;
create policy "Users can read own lab exam interests"
on public.lab_exam_interests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users manage own daily checkins" on public.daily_checkins;
create policy "Users manage own daily checkins"
on public.daily_checkins
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.checkins to authenticated;
grant select on public.medico_profiles to authenticated;
grant select, insert, update on public.exam_requests to authenticated;
grant select, insert, delete on public.exams to authenticated;
grant select, insert, update on public.exam_results to authenticated;
grant select, insert, delete on public.medications to authenticated;
grant select, insert on public.medication_adherence_logs to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert on public.feedbacks to authenticated;
grant select, insert, update on public.onboarding_chat_progress to authenticated;
grant select, insert on public.carelito_conversations to authenticated;
grant select, insert, update on public.user_activity_days to authenticated;
grant select, insert on public.user_activity_events to authenticated;
grant select, insert on public.lab_exam_interests to authenticated;
grant select, insert, update, delete on public.daily_checkins to authenticated;

grant all on public.profiles to service_role;
grant all on public.assessments to service_role;
grant all on public.checkins to service_role;
grant all on public.medico_profiles to service_role;
grant all on public.exam_requests to service_role;
grant all on public.exams to service_role;
grant all on public.exam_results to service_role;
grant all on public.medications to service_role;
grant all on public.medication_adherence_logs to service_role;
grant all on public.notification_preferences to service_role;
grant all on public.feedbacks to service_role;
grant all on public.onboarding_chat_progress to service_role;
grant all on public.carelito_conversations to service_role;
grant all on public.user_activity_days to service_role;
grant all on public.user_activity_events to service_role;
grant all on public.lab_exam_interests to service_role;
grant all on public.daily_checkins to service_role;

-- ---------------------------------------------------------------------------
-- Storage buckets and policies
-- Current frontend uses getPublicUrl(), so these buckets are public for MVP.
-- Move exams/results/requisicoes to signed URLs before broader production.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('exams', 'exams', true),
  ('resultados_exames', 'resultados_exames', true),
  ('requisicoes', 'requisicoes', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own exams" on storage.objects;
create policy "Users can upload own exams"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'exams' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can read own exams storage" on storage.objects;
create policy "Users can read own exams storage"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exams'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (select 1 from public.medico_profiles mp where mp.id = auth.uid())
  )
);

drop policy if exists "Users can upload own exam results" on storage.objects;
create policy "Users can upload own exam results"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'resultados_exames' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can read own exam results storage" on storage.objects;
create policy "Users can read own exam results storage"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resultados_exames'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (select 1 from public.medico_profiles mp where mp.id = auth.uid())
  )
);

drop policy if exists "Authenticated users can upload requisicoes" on storage.objects;
create policy "Authenticated users can upload requisicoes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'requisicoes'
  and exists (select 1 from public.medico_profiles mp where mp.id = auth.uid())
);

drop policy if exists "Authenticated users can read requisicoes" on storage.objects;
create policy "Authenticated users can read requisicoes"
on storage.objects
for select
to authenticated
using (bucket_id = 'requisicoes');
