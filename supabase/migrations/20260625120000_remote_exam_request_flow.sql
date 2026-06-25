do $$
begin
  if exists (select 1 from pg_type where typname = 'exam_request_status') then
    if not exists (
      select 1
      from pg_enum
      where enumlabel = 'aguardando_medico'
        and enumtypid = 'public.exam_request_status'::regtype
    ) then
      alter type public.exam_request_status add value 'aguardando_medico';
    end if;
  end if;
end $$;

alter table public.exam_requests
  add column if not exists nome text,
  add column if not exists score_atual integer,
  add column if not exists fatores_risco text[],
  add column if not exists requisicao_url text,
  add column if not exists requisicao_path text,
  add column if not exists nota_medico text,
  add column if not exists authorized_at timestamptz,
  add column if not exists resultado_received_at timestamptz;

alter table public.exam_requests
  alter column cidade drop not null,
  alter column telefone_whatsapp drop not null;

drop policy if exists "Users can update result of own authorized exam request" on public.exam_requests;
create policy "Users can update result of own authorized exam request"
on public.exam_requests
for update
to authenticated
using (auth.uid() = user_id and status in ('autorizado', 'resultado_recebido', 'concluido'))
with check (auth.uid() = user_id and status in ('autorizado', 'resultado_recebido', 'concluido'));

insert into storage.buckets (id, name, public)
values ('requisicoes', 'requisicoes', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('resultados_exames', 'resultados_exames', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can upload requisicoes" on storage.objects;
create policy "Authenticated users can upload requisicoes"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'requisicoes');

drop policy if exists "Authenticated users can read requisicoes" on storage.objects;
create policy "Authenticated users can read requisicoes"
on storage.objects
for select
to authenticated
using (bucket_id = 'requisicoes');

drop policy if exists "Users can upload own exam results" on storage.objects;
create policy "Users can upload own exam results"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resultados_exames'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can read own exam results" on storage.objects;
create policy "Users can read own exam results"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resultados_exames'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.medico_profiles mp where mp.id = auth.uid())
  )
);
