create table if not exists public.onboarding_chat_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  step integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  skipped boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.onboarding_chat_progress enable row level security;

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

grant select, insert, update on public.onboarding_chat_progress to authenticated;
