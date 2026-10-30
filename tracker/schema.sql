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

-- ---------- v6: coach notifications (client started / finished a workout) + phone push subscriptions ----------
create table if not exists public.coach_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists coach_notifications_created_idx on public.coach_notifications(created_at desc);
alter table public.coach_notifications enable row level security;
drop policy if exists "notif coach read" on public.coach_notifications;
create policy "notif coach read" on public.coach_notifications for select using (public.is_coach());
drop policy if exists "notif coach update" on public.coach_notifications;
create policy "notif coach update" on public.coach_notifications for update using (public.is_coach()) with check (public.is_coach());
-- inserts only via the notify-coach edge function (secret key)

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push own" on public.push_subscriptions;
create policy "push own" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- alter publication supabase_realtime add table public.coach_notifications;
-- private VAPID key pair for phone push, created by the notify-coach function on first use (no policies = not readable from the app)
create table if not exists public.push_config (id int primary key, public_key text not null, private_key text not null);
alter table public.push_config enable row level security;

-- ---------- v7: private coach video library (only coaches and clients with a programme can read it) ----------
create table if not exists public.exercise_videos (
  id bigint generated always as identity primary key,
  exercise text not null,
  youtube_id text not null unique,
  label text,
  sort int not null default 0
);
alter table public.exercise_videos enable row level security;
drop policy if exists "videos coach and clients" on public.exercise_videos;
create policy "videos coach and clients" on public.exercise_videos for select
  using (public.is_coach() or exists (select 1 from public.programs p where p.client_id = auth.uid()));
drop policy if exists "videos coach write" on public.exercise_videos;
create policy "videos coach write" on public.exercise_videos for all using (public.is_coach()) with check (public.is_coach());
-- rows: one per video (exercise name must match tracker/exercises.js). Free videos stay in tracker/videos.js.

-- ---------- v8: link programmes to the template they were assigned from (assign / unassign) ----------
alter table public.programs add column if not exists template_id uuid references public.program_templates(id) on delete set null;
create index if not exists programs_template_idx on public.programs(template_id);
-- ---------- v9: coach hub — profile photo/bio, client invites, avatars storage ----------
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists instagram text;
drop policy if exists "profiles read coaches" on public.profiles;
create policy "profiles read coaches" on public.profiles for select to authenticated using (role = 'coach');

create table if not exists public.client_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  template_id uuid references public.program_templates(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_user uuid references public.profiles(id) on delete set null
);
create unique index if not exists client_invites_open_email on public.client_invites (lower(email)) where accepted_at is null;
alter table public.client_invites enable row level security;
drop policy if exists "invites coach" on public.client_invites;
create policy "invites coach" on public.client_invites for all using (public.is_coach()) with check (public.is_coach());

-- when an invited client signs in for the first time: set their name and give them the chosen programme
create or replace function public.apply_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.client_invites; t public.program_templates;
begin
  select * into inv from public.client_invites where lower(email) = lower(new.email) and accepted_at is null order by created_at desc limit 1;
  if inv.id is null then return new; end if;
  if coalesce(inv.name, '') <> '' then update public.profiles set name = inv.name where id = new.id; end if;
  if inv.template_id is not null then
    select * into t from public.program_templates where id = inv.template_id;
    if t.id is not null then
      insert into public.programs (client_id, name, notes, days, active, created_by, template_id)
      values (new.id, t.name, t.notes, t.days, true, inv.created_by, t.id);
    end if;
  end if;
  update public.client_invites set accepted_at = now(), accepted_user = new.id where id = inv.id;
  return new;
end $$;
drop trigger if exists profiles_apply_invite on public.profiles;
create trigger profiles_apply_invite after insert on public.profiles for each row execute function public.apply_invite();

-- profile photos (public read, each user writes only in their own folder)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- v10: website leads (every website form saves here first; Formspree stays as the email alert) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  form text, subject text, name text, email text, phone text, source text, page text, language text,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  notes text,
  data jsonb not null default '{}'::jsonb
);
create index if not exists leads_created_idx on public.leads (created_at desc);
alter table public.leads enable row level security;
drop policy if exists "Anyone can submit a lead" on public.leads;
create policy "Anyone can submit a lead" on public.leads for insert to anon, authenticated
  with check (status = 'new' and notes is null
    and coalesce(length(name),0) <= 200 and coalesce(length(email),0) <= 320 and coalesce(length(phone),0) <= 60
    and coalesce(length(subject),0) <= 300 and coalesce(length(source),0) <= 300 and coalesce(length(page),0) <= 500
    and pg_column_size(data) < 30000);
drop policy if exists "Coaches read leads" on public.leads;
create policy "Coaches read leads" on public.leads for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
drop policy if exists "Coaches update leads" on public.leads;
create policy "Coaches update leads" on public.leads for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
revoke all on public.leads from anon;
grant insert on public.leads to anon, authenticated;
grant select, update on public.leads to authenticated;

-- ---------- v11: coaches can remove (hide) a client from their lists without deleting any data ----------
alter table public.profiles add column if not exists archived boolean not null default false;

-- ---------- v12: daily habits (steps, water, sleep, energy, mood) + personal goals ----------
create table if not exists public.habit_logs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  steps int check (steps between 0 and 100000),
  water smallint check (water between 0 and 30),
  sleep numeric(3,1) check (sleep between 0 and 24),
  energy smallint check (energy between 1 and 5),
  mood smallint check (mood between 1 and 5),
  note text check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.habit_logs enable row level security;
drop policy if exists "habits read" on public.habit_logs;
create policy "habits read" on public.habit_logs for select using (user_id = auth.uid() or public.is_coach());
drop policy if exists "habits own" on public.habit_logs;
create policy "habits own" on public.habit_logs for all
  using (user_id = auth.uid() or public.is_coach()) with check (user_id = auth.uid() or public.is_coach());
alter table public.profiles add column if not exists habit_goals jsonb;

-- ---------- v13: daily habit reminder (push) ----------
alter table public.profiles add column if not exists habit_reminder jsonb;
create table if not exists public.private_config (key text primary key, value text not null);
alter table public.private_config enable row level security;  -- no policies: only the server (secret key) can read it
insert into public.private_config (key, value) values ('cron_secret', md5(random()::text || clock_timestamp()::text) || md5(random()::text)) on conflict (key) do nothing;
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('habit-reminders') where exists (select 1 from cron.job where jobname = 'habit-reminders');
select cron.schedule('habit-reminders', '0 * * * *', $cron$
  select net.http_post(
    url := 'https://iwtkphupsobwiaiqvkok.supabase.co/functions/v1/habit-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.private_config where key = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
$cron$);
