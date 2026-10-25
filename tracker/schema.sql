-- Mr & Mrs Lifestyle tracker: secure schema (Supabase).
-- Every client sees only their own data. Coaches (profiles.role = 'coach') see all clients and manage programmes.

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'client' check (role in ('client','coach')),
  goal text,
  unit text not null default 'kg' check (unit in ('kg','lb')),
  created_at timestamptz not null default now()
);

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

-- new sign-ups get a profile automatically
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- clients cannot promote themselves to coach
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- dashboard/admin SQL has no auth.uid(); app users always do
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_coach() then
    new.role := old.role;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.is_coach());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.is_coach());

-- ---------- programmes ----------
-- days: [{ "name": "Day 1 · Push", "exercises": [{ "name": "...", "sets": 3, "reps": "8-10", "rest": 90, "notes": "" }] }]
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  notes text,
  days jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists programs_client_idx on public.programs(client_id);
alter table public.programs enable row level security;
drop policy if exists "programs read" on public.programs;
create policy "programs read" on public.programs for select using (client_id = auth.uid() or public.is_coach());
drop policy if exists "programs write" on public.programs;
create policy "programs write" on public.programs for all
  using (public.is_coach() or (client_id = auth.uid() and created_by = auth.uid()))
  with check (public.is_coach() or (client_id = auth.uid() and created_by = auth.uid()));

-- ---------- workouts ----------
-- exercises: [{ "name": "...", "cat": "...", "type": "w|b|t|c", "sets": [{ "w": 60, "r": 8, "done": true }] }]
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  title text,
  program_id uuid references public.programs(id) on delete set null,
  exercises jsonb not null default '[]'::jsonb,
  duration_min int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_date_idx on public.workouts(user_id, date desc);
alter table public.workouts enable row level security;
drop policy if exists "workouts read" on public.workouts;
create policy "workouts read" on public.workouts for select using (user_id = auth.uid() or public.is_coach());
drop policy if exists "workouts own" on public.workouts;
create policy "workouts own" on public.workouts for all
  using (user_id = auth.uid() or public.is_coach()) with check (user_id = auth.uid() or public.is_coach());

-- ---------- body logs ----------
create table if not exists public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  weight numeric(5,1),
  body_fat numeric(4,1),
  waist numeric(5,1),
  chest numeric(5,1),
  hips numeric(5,1),
  arm numeric(4,1),
  thigh numeric(5,1),
  photo_path text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists body_logs_user_date_idx on public.body_logs(user_id, date desc);
alter table public.body_logs enable row level security;
drop policy if exists "body read" on public.body_logs;
create policy "body read" on public.body_logs for select using (user_id = auth.uid() or public.is_coach());
drop policy if exists "body own" on public.body_logs;
create policy "body own" on public.body_logs for all
  using (user_id = auth.uid() or public.is_coach()) with check (user_id = auth.uid() or public.is_coach());

-- ---------- progress photos (private bucket, folder = user id) ----------
insert into storage.buckets (id, name, public) values ('progress-photos','progress-photos', false)
  on conflict (id) do update set public = false;
drop policy if exists "photos read" on storage.objects;
create policy "photos read" on storage.objects for select
  using (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
drop policy if exists "photos insert" on storage.objects;
create policy "photos insert" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos delete" on storage.objects;
create policy "photos delete" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- v2: InBody fields + coach can attach photos for clients ----------
alter table public.body_logs
  add column if not exists muscle_mass numeric(5,1),
  add column if not exists fat_mass numeric(5,1),
  add column if not exists inbody_score int,
  add column if not exists visceral_fat int,
  add column if not exists bmr int;
drop policy if exists "photos insert" on storage.objects;
create policy "photos insert" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
drop policy if exists "photos delete" on storage.objects;
create policy "photos delete" on storage.objects for delete
  using (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));

-- ---------- v3: only coaches create or edit programmes ----------
drop policy if exists "programs write" on public.programs;
create policy "programs write" on public.programs for all using (public.is_coach()) with check (public.is_coach());

-- ---------- v4: live shared open workout (coach and client see the same sets as they type) ----------
create table if not exists public.live_workouts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb,
  rev bigint not null default 0,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.live_workouts enable row level security;
drop policy if exists "live read" on public.live_workouts;
create policy "live read" on public.live_workouts for select using (user_id = auth.uid() or public.is_coach());
drop policy if exists "live write" on public.live_workouts;
create policy "live write" on public.live_workouts for all using (user_id = auth.uid() or public.is_coach()) with check (user_id = auth.uid() or public.is_coach());
-- alter publication supabase_realtime add table public.live_workouts;

-- ---------- v5: programme templates (coach library, reusable for any client) ----------
create table if not exists public.program_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  days jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.program_templates enable row level security;
drop policy if exists "templates coach only" on public.program_templates;
create policy "templates coach only" on public.program_templates for all using (public.is_coach()) with check (public.is_coach());
