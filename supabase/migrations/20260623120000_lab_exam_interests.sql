create table if not exists public.lab_exam_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text not null,
  cidade text not null,
  source text not null default 'home',
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.lab_exam_interests enable row level security;

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

grant select, insert on public.lab_exam_interests to authenticated;

create index if not exists lab_exam_interests_user_created_idx
on public.lab_exam_interests (user_id, created_at desc);
