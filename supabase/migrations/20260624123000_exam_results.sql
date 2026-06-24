create table if not exists public.medico_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  crm text,
  created_at timestamptz not null default now()
);

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

alter table public.exam_requests enable row level security;

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
using (
  exists (
    select 1
    from public.medico_profiles
    where medico_profiles.id = auth.uid()
  )
);

drop policy if exists "Doctors can update exam requests" on public.exam_requests;
create policy "Doctors can update exam requests"
on public.exam_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.medico_profiles
    where medico_profiles.id = auth.uid()
  )
);

grant select, insert, update on public.exam_requests to authenticated;

create index if not exists exam_requests_user_created_idx
on public.exam_requests (user_id, created_at desc);

create index if not exists exam_requests_status_created_idx
on public.exam_requests (status, created_at desc);

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

alter table public.exam_results enable row level security;

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
using (
  exists (
    select 1
    from public.medico_profiles
    where medico_profiles.id = auth.uid()
  )
);

grant select, insert, update on public.exam_results to authenticated;

create index if not exists exam_results_user_created_idx
on public.exam_results (user_id, created_at desc);

create index if not exists exam_results_request_idx
on public.exam_results (exam_request_id);
