alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_checkin boolean not null default true,
  weekly_summary_email boolean not null default false,
  new_mission boolean not null default true,
  achievement_unlocked boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can read own notification preferences"
  on public.notification_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
  on public.notification_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification preferences"
  on public.notification_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'outro',
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.medications enable row level security;

create policy "Users can read own medications"
  on public.medications
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own medications"
  on public.medications
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own medications"
  on public.medications
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

create policy "Users can upload own avatar"
  on storage.objects
  for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own avatar"
  on storage.objects
  for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatar images are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');
