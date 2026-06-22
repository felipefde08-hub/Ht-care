create table if not exists public.user_activity_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  actions text[] not null default '{}',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

alter table public.user_activity_days enable row level security;

create policy "Users can read own activity days"
  on public.user_activity_days
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own activity days"
  on public.user_activity_days
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own activity days"
  on public.user_activity_days
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_activity_days_user_month_idx
  on public.user_activity_days (user_id, activity_date desc);
