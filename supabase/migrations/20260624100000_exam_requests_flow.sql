do $$
begin
  if not exists (select 1 from pg_type where typname = 'exam_request_status') then
    create type public.exam_request_status as enum (
      'aguardando_autorizacao',
      'autorizado',
      'recusado',
      'resultado_recebido',
      'concluido'
    );
  end if;
end $$;

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
  cidade text not null,
  telefone_whatsapp text not null,
  plano_saude text,
  medico_id uuid references public.medico_profiles(id) on delete set null,
  observacao_medico text,
  resultado_url text,
  resultado_path text,
  laboratorio_nome text,
  laboratorio_endereco text,
  laboratorio_telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.medico_profiles enable row level security;
alter table public.exam_requests enable row level security;

drop policy if exists "Doctors can read own medico profile" on public.medico_profiles;
create policy "Doctors can read own medico profile"
on public.medico_profiles
for select
to authenticated
using (auth.uid() = id);

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
using (
  auth.uid() = user_id
  or exists (select 1 from public.medico_profiles mp where mp.id = auth.uid())
);

drop policy if exists "Users can update result of own authorized exam request" on public.exam_requests;
create policy "Users can update result of own authorized exam request"
on public.exam_requests
for update
to authenticated
using (auth.uid() = user_id and status = 'autorizado')
with check (auth.uid() = user_id and status in ('autorizado', 'resultado_recebido'));

drop policy if exists "Doctors can update exam requests" on public.exam_requests;
create policy "Doctors can update exam requests"
on public.exam_requests
for update
to authenticated
using (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()))
with check (exists (select 1 from public.medico_profiles mp where mp.id = auth.uid()));

grant select on public.medico_profiles to authenticated;
grant select, insert, update on public.exam_requests to authenticated;

create index if not exists exam_requests_user_created_idx
on public.exam_requests (user_id, created_at desc);

create index if not exists exam_requests_status_created_idx
on public.exam_requests (status, created_at desc);
