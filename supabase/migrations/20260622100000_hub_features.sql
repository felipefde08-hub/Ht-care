alter table public.medications
  add column if not exists dose text,
  add column if not exists schedule_times text[] not null default array[]::text[],
  add column if not exists reminder_enabled boolean not null default false;

create table if not exists public.medication_adherence_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  log_date date not null default current_date,
  taken_at timestamptz not null default now(),
  unique (user_id, medication_id, log_date)
);

alter table public.medication_adherence_logs enable row level security;

drop policy if exists "Users can read own medication adherence" on public.medication_adherence_logs;
create policy "Users can read own medication adherence"
on public.medication_adherence_logs
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own medication adherence" on public.medication_adherence_logs;
create policy "Users can insert own medication adherence"
on public.medication_adherence_logs
for insert
with check (auth.uid() = user_id);

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

alter table public.exams enable row level security;

drop policy if exists "Users can read own exams" on public.exams;
create policy "Users can read own exams"
on public.exams
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own exams" on public.exams;
create policy "Users can insert own exams"
on public.exams
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own exams" on public.exams;
create policy "Users can delete own exams"
on public.exams
for delete
using (auth.uid() = user_id);

create table if not exists public.carelito_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.carelito_conversations enable row level security;

drop policy if exists "Users can read own carelito messages" on public.carelito_conversations;
create policy "Users can read own carelito messages"
on public.carelito_conversations
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own carelito messages" on public.carelito_conversations;
create policy "Users can insert own carelito messages"
on public.carelito_conversations
for insert
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('exams', 'exams', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload own exams" on storage.objects;
create policy "Users can upload own exams"
on storage.objects
for insert
with check (
  bucket_id = 'exams'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Exam files are publicly readable" on storage.objects;
create policy "Exam files are publicly readable"
on storage.objects
for select
using (bucket_id = 'exams');

grant select, insert, delete on public.exams to authenticated;
grant select, insert on public.medication_adherence_logs to authenticated;
grant select, insert on public.carelito_conversations to authenticated;

create index if not exists exams_user_created_idx
on public.exams (user_id, created_at desc);

create index if not exists carelito_messages_user_created_idx
on public.carelito_conversations (user_id, created_at asc);

create index if not exists medication_adherence_user_month_idx
on public.medication_adherence_logs (user_id, log_date desc);
