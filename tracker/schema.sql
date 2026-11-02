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

-- ---------- v14: calories burnt per workout (estimate or from the client's watch) ----------
alter table public.workouts
  add column if not exists kcal int check (kcal between 0 and 5000),
  add column if not exists kcal_source text check (kcal_source in ('est','watch'));

-- ---------- v15: daily calorie target (goal + optional coach override) ----------
alter table public.profiles add column if not exists nutrition jsonb;

-- ---------- v16: food log (search, photo AI estimate or custom entry) ----------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  meal text not null default 'snack' check (meal in ('breakfast','lunch','dinner','snack')),
  name text not null check (char_length(name) between 1 and 80),
  amount text check (char_length(amount) <= 60),
  kcal int not null check (kcal between 0 and 5000),
  protein numeric(5,1) check (protein between 0 and 500),
  carbs numeric(5,1) check (carbs between 0 and 800),
  fat numeric(5,1) check (fat between 0 and 500),
  source text not null default 'db' check (source in ('db','ai','custom')),
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_date_idx on public.food_logs(user_id, date desc);
alter table public.food_logs enable row level security;
drop policy if exists "food read" on public.food_logs;
create policy "food read" on public.food_logs for select using (user_id = auth.uid() or public.is_coach());
drop policy if exists "food own" on public.food_logs;
create policy "food own" on public.food_logs for all
  using (user_id = auth.uid() or public.is_coach()) with check (user_id = auth.uid() or public.is_coach());

-- ---------- v17: coach approval — new sign-ups wait until a coach approves them ----------
-- access: pending (just signed up), approved (can use the tracker), declined. Everyone already here stays approved.
alter table public.profiles add column if not exists access text not null default 'pending' check (access in ('pending','approved','declined'));
alter table public.profiles add column if not exists access_at timestamptz;
update public.profiles set access = 'approved', access_at = coalesce(access_at, now()) where access = 'pending';
update public.profiles set access = 'approved' where role = 'coach';

-- true for coaches and approved clients
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (role = 'coach' or access = 'approved'));
$$;

-- clients cannot promote themselves to coach or approve themselves
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_coach() then
    if new.role is distinct from old.role then new.role := old.role; end if;
    if new.access is distinct from old.access then new.access := old.access; new.access_at := old.access_at; end if;
  end if;
  if new.access is distinct from old.access then new.access_at := now(); end if;
  return new;
end $$;

-- invited clients are approved straight away (the coach invited them)
create or replace function public.apply_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.client_invites; t public.program_templates;
begin
  select * into inv from public.client_invites where lower(email) = lower(new.email) and accepted_at is null order by created_at desc limit 1;
  if inv.id is null then return new; end if;
  update public.profiles set access = 'approved', access_at = now() where id = new.id;
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

-- tell the coaches (bell) when someone new asks for access; runs after apply_invite (alphabetical)
create or replace function public.notify_access_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.id;
  if p.access = 'pending' and p.role <> 'coach' then
    insert into public.coach_notifications (client_id, kind, title, body)
    values (p.id, 'access', coalesce(nullif(p.name, ''), split_part(p.email, '@', 1)) || ' asked for access to the tracker', p.email || ' · tap to approve or decline');
  end if;
  return new;
end $$;
drop trigger if exists profiles_zz_notify_access on public.profiles;
create trigger profiles_zz_notify_access after insert on public.profiles for each row execute function public.notify_access_request();

-- the tracker's data: own rows only once approved (coaches unchanged)
drop policy if exists "workouts read" on public.workouts;
create policy "workouts read" on public.workouts for select using ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "workouts own" on public.workouts;
create policy "workouts own" on public.workouts for all
  using ((user_id = auth.uid() and public.is_approved()) or public.is_coach()) with check ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "body read" on public.body_logs;
create policy "body read" on public.body_logs for select using ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "body own" on public.body_logs;
create policy "body own" on public.body_logs for all
  using ((user_id = auth.uid() and public.is_approved()) or public.is_coach()) with check ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "programs read" on public.programs;
create policy "programs read" on public.programs for select using ((client_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "live read" on public.live_workouts;
create policy "live read" on public.live_workouts for select using ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "live write" on public.live_workouts;
create policy "live write" on public.live_workouts for all using ((user_id = auth.uid() and public.is_approved()) or public.is_coach()) with check ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "habits read" on public.habit_logs;
create policy "habits read" on public.habit_logs for select using ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "habits own" on public.habit_logs;
create policy "habits own" on public.habit_logs for all
  using ((user_id = auth.uid() and public.is_approved()) or public.is_coach()) with check ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "food read" on public.food_logs;
create policy "food read" on public.food_logs for select using ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "food own" on public.food_logs;
create policy "food own" on public.food_logs for all
  using ((user_id = auth.uid() and public.is_approved()) or public.is_coach()) with check ((user_id = auth.uid() and public.is_approved()) or public.is_coach());
drop policy if exists "videos coach and clients" on public.exercise_videos;
create policy "videos coach and clients" on public.exercise_videos for select
  using (public.is_coach() or (public.is_approved() and exists (select 1 from public.programs p where p.client_id = auth.uid())));
drop policy if exists "photos read" on storage.objects;
create policy "photos read" on storage.objects for select
  using (bucket_id = 'progress-photos' and (((storage.foldername(name))[1] = auth.uid()::text and public.is_approved()) or public.is_coach()));
drop policy if exists "photos insert" on storage.objects;
create policy "photos insert" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (((storage.foldername(name))[1] = auth.uid()::text and public.is_approved()) or public.is_coach()));

-- ---------- v18: The Pilates Room rewards card (Apple Wallet) ----------
-- Tables are locked (RLS on, no policies). Everything goes through the functions below:
--   tpr_server(secret, …)   used by the website's server functions (secret lives in Vercel env TPR_SECRET)
--   tpr_staff(secret, pin, …) Chloe's check-in page, via the server, with the staff PIN
--   tpr_admin(…)             coach accounts only: set the PIN, store the Apple certificate, read the secret
create extension if not exists pgcrypto with schema extensions;
create sequence if not exists public.tpr_serial_seq start 101;
create table if not exists public.tpr_members (
  id bigint generated always as identity primary key,
  serial text unique not null default ('TPR-' || lpad(nextval('public.tpr_serial_seq')::text, 6, '0')),
  auth_token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  share_code text unique not null default encode(extensions.gen_random_bytes(8), 'hex'),
  name text not null check (char_length(name) between 1 and 80),
  phone text check (char_length(phone) <= 30),
  email text check (char_length(email) <= 120),
  sessions int not null default 0 check (sessions between 0 and 5000),
  reward10_at timestamptz,
  reward20_at timestamptz,
  free_earned int not null default 0 check (free_earned between 0 and 500),
  free_used int not null default 0 check (free_used between 0 and 500),
  last_session date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tpr_log (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.tpr_members(id) on delete cascade,
  action text not null,
  delta int not null default 0,
  note text,
  at timestamptz not null default now()
);
create index if not exists tpr_log_member_idx on public.tpr_log(member_id, at desc);
create table if not exists public.tpr_devices (
  device_id text not null,
  push_token text not null,
  serial text not null references public.tpr_members(serial) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, serial)
);
create table if not exists public.tpr_pin_fails (at timestamptz not null default now());
alter table public.tpr_members enable row level security;
alter table public.tpr_log enable row level security;
alter table public.tpr_devices enable row level security;
alter table public.tpr_pin_fails enable row level security;
revoke all on public.tpr_members, public.tpr_log, public.tpr_devices, public.tpr_pin_fails from anon, authenticated;
insert into public.private_config (key, value) values ('tpr_secret', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (key) do nothing;

create or replace function public.tpr_cfg(k text) returns text
language sql stable security definer set search_path = public as $$ select value from public.private_config where key = k $$;
revoke all on function public.tpr_cfg(text) from public, anon, authenticated;

create or replace function public.tpr_member_json(m public.tpr_members, with_secret boolean default false) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('id', m.id, 'serial', m.serial, 'name', m.name, 'phone', m.phone, 'email', m.email,
    'sessions', m.sessions, 'reward10_at', m.reward10_at, 'reward20_at', m.reward20_at,
    'free_earned', m.free_earned, 'free_used', m.free_used, 'last_session', m.last_session,
    'archived', m.archived, 'created_at', m.created_at, 'updated_at', m.updated_at,
    'updated_epoch', floor(extract(epoch from m.updated_at))::bigint, 'share_code', m.share_code)
    || case when with_secret then jsonb_build_object('auth_token', m.auth_token) else '{}'::jsonb end
$$;

-- server-side calls (website functions)
create or replace function public.tpr_server(p_secret text, p_action text, p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.tpr_members; r jsonb;
begin
  if p_secret is null or p_secret <> public.tpr_cfg('tpr_secret') then raise exception 'forbidden'; end if;
  if p_action = 'wallet_keys' then
    return jsonb_build_object('key', public.tpr_cfg('tpr_pass_key'), 'cert', public.tpr_cfg('tpr_pass_cert'),
      'pass_type_id', public.tpr_cfg('tpr_pass_type_id'), 'team_id', public.tpr_cfg('tpr_team_id'));
  elsif p_action = 'member_by_token' then
    select * into m from public.tpr_members where serial = p_args->>'serial' and auth_token = p_args->>'token' and not archived;
    if m.id is null then return null; end if;
    return public.tpr_member_json(m, true);
  elsif p_action = 'member_by_share' then
    select * into m from public.tpr_members where share_code = p_args->>'code' and not archived;
    if m.id is null then return null; end if;
    return public.tpr_member_json(m, true);
  elsif p_action = 'member_by_serial' then
    select * into m from public.tpr_members where serial = p_args->>'serial';
    if m.id is null then return null; end if;
    return public.tpr_member_json(m, true);
  elsif p_action = 'register' then
    select * into m from public.tpr_members where serial = p_args->>'serial' and auth_token = p_args->>'token';
    if m.id is null then return jsonb_build_object('status', 401); end if;
    if exists (select 1 from public.tpr_devices where device_id = p_args->>'device' and serial = m.serial) then
      update public.tpr_devices set push_token = p_args->>'push' where device_id = p_args->>'device' and serial = m.serial;
      return jsonb_build_object('status', 200);
    end if;
    insert into public.tpr_devices (device_id, push_token, serial) values (p_args->>'device', p_args->>'push', m.serial);
    return jsonb_build_object('status', 201);
  elsif p_action = 'unregister' then
    select * into m from public.tpr_members where serial = p_args->>'serial' and auth_token = p_args->>'token';
    if m.id is null then return jsonb_build_object('status', 401); end if;
    delete from public.tpr_devices where device_id = p_args->>'device' and serial = m.serial;
    return jsonb_build_object('status', 200);
  elsif p_action = 'serials_for_device' then
    select jsonb_build_object(
      'serials', coalesce(jsonb_agg(m2.serial), '[]'::jsonb),
      'last', coalesce(max(floor(extract(epoch from m2.updated_at))::bigint), 0))
    into r
    from public.tpr_devices d join public.tpr_members m2 on m2.serial = d.serial
    where d.device_id = p_args->>'device'
      and (coalesce(p_args->>'since', '') = '' or floor(extract(epoch from m2.updated_at))::bigint > (p_args->>'since')::bigint);
    return r;
  elsif p_action = 'push_tokens' then
    return (select coalesce(jsonb_agg(push_token), '[]'::jsonb) from public.tpr_devices where serial = p_args->>'serial');
  elsif p_action = 'drop_token' then
    delete from public.tpr_devices where push_token = p_args->>'push';
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'bad action';
end $$;
revoke all on function public.tpr_server(text, text, jsonb) from public;
grant execute on function public.tpr_server(text, text, jsonb) to anon, authenticated;

-- Chloe's check-in page (through the website server, with the staff PIN)
create or replace function public.tpr_staff(p_secret text, p_pin text, p_action text, p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m public.tpr_members; today date := (now() at time zone 'Asia/Dubai')::date; v int; lid bigint; la text; ld int;
begin
  if p_secret is null or p_secret <> public.tpr_cfg('tpr_secret') then raise exception 'forbidden'; end if;
  if public.tpr_cfg('tpr_pin_hash') is null then return jsonb_build_object('error', 'no_pin'); end if;
  if (select count(*) from public.tpr_pin_fails where at > now() - interval '15 minutes') >= 8 then
    return jsonb_build_object('error', 'locked');
  end if;
  if p_pin is null or crypt(p_pin, public.tpr_cfg('tpr_pin_hash')) <> public.tpr_cfg('tpr_pin_hash') then
    insert into public.tpr_pin_fails default values;
    return jsonb_build_object('error', 'wrong_pin');
  end if;
  delete from public.tpr_pin_fails where at < now() - interval '1 day';

  if p_action = 'check' then return jsonb_build_object('ok', true); end if;
  if p_action = 'list' then
    return jsonb_build_object('members', (select coalesce(jsonb_agg(public.tpr_member_json(x) order by x.name), '[]'::jsonb) from public.tpr_members x where not x.archived));
  end if;
  if p_action = 'add' then
    if coalesce(trim(p_args->>'name'), '') = '' then return jsonb_build_object('error', 'name_required'); end if;
    insert into public.tpr_members (name, phone, email, sessions, free_earned)
      values (trim(p_args->>'name'), nullif(trim(p_args->>'phone'), ''), nullif(trim(p_args->>'email'), ''),
              greatest(0, coalesce((p_args->>'sessions')::int, 0)), greatest(0, coalesce((p_args->>'free')::int, 0)))
      returning * into m;
    insert into public.tpr_log (member_id, action, delta, note) values (m.id, 'created', m.sessions, 'starting count');
    return jsonb_build_object('member', public.tpr_member_json(m));
  end if;

  -- everything below works on one member, found by id or by the code scanned from the card
  if p_args ? 'id' then select * into m from public.tpr_members where id = (p_args->>'id')::bigint;
  else select * into m from public.tpr_members where serial = upper(trim(p_args->>'serial')); end if;
  if m.id is null then return jsonb_build_object('error', 'not_found'); end if;
  if m.archived and p_action <> 'restore' then return jsonb_build_object('error', 'archived'); end if;

  if p_action = 'get' then
    return jsonb_build_object('member', public.tpr_member_json(m),
      'log', (select coalesce(jsonb_agg(jsonb_build_object('action', l.action, 'delta', l.delta, 'note', l.note, 'at', l.at) order by l.at desc), '[]'::jsonb)
              from (select * from public.tpr_log where member_id = m.id order by at desc limit 20) l));
  elsif p_action = 'session' then
    if m.last_session = today and coalesce((p_args->>'force')::boolean, false) = false then
      return jsonb_build_object('warn', 'already_today', 'member', public.tpr_member_json(m));
    end if;
    update public.tpr_members set sessions = sessions + 1, last_session = today, updated_at = now() where id = m.id returning * into m;
    insert into public.tpr_log (member_id, action, delta) values (m.id, 'session', 1) returning id into lid;
    return jsonb_build_object('member', public.tpr_member_json(m), 'log_id', lid, 'changed', true);
  elsif p_action = 'undo' then
    select id, action, delta into lid, la, ld from public.tpr_log where member_id = m.id and action in ('session', 'free_add', 'free_use') and note is distinct from 'undone' order by at desc limit 1;
    if lid is null then return jsonb_build_object('error', 'nothing_to_undo'); end if;
    if la = 'session' then
      update public.tpr_members set sessions = greatest(0, sessions - 1),
        last_session = (select max((l2.at at time zone 'Asia/Dubai')::date) from public.tpr_log l2 where l2.member_id = m.id and l2.action = 'session' and l2.id <> lid and l2.note is distinct from 'undone'),
        updated_at = now() where id = m.id returning * into m;
    elsif la = 'free_add' then
      update public.tpr_members set free_earned = greatest(0, free_earned - 1), updated_at = now() where id = m.id returning * into m;
    else
      update public.tpr_members set free_used = greatest(0, free_used - 1), updated_at = now() where id = m.id returning * into m;
    end if;
    update public.tpr_log set note = 'undone' where id = lid;
    return jsonb_build_object('member', public.tpr_member_json(m), 'undone', la, 'changed', true);
  elsif p_action = 'set_sessions' then
    v := (p_args->>'sessions')::int;
    if v is null or v < 0 or v > 5000 then return jsonb_build_object('error', 'bad_number'); end if;
    insert into public.tpr_log (member_id, action, delta, note) values (m.id, 'set', v - m.sessions, 'count set to ' || v);
    update public.tpr_members set sessions = v, updated_at = now() where id = m.id returning * into m;
    return jsonb_build_object('member', public.tpr_member_json(m), 'changed', true);
  elsif p_action = 'free_add' then
    update public.tpr_members set free_earned = free_earned + 1, updated_at = now() where id = m.id returning * into m;
    insert into public.tpr_log (member_id, action, delta, note) values (m.id, 'free_add', 1, nullif(trim(p_args->>'note'), ''));
    return jsonb_build_object('member', public.tpr_member_json(m), 'changed', true);
  elsif p_action = 'free_use' then
    if m.free_used >= m.free_earned then return jsonb_build_object('error', 'no_free_sessions'); end if;
    update public.tpr_members set free_used = free_used + 1, updated_at = now() where id = m.id returning * into m;
    insert into public.tpr_log (member_id, action, delta) values (m.id, 'free_use', 1);
    return jsonb_build_object('member', public.tpr_member_json(m), 'changed', true);
  elsif p_action = 'reward_given' then
    if (p_args->>'level') = '10' and m.sessions >= 10 then
      update public.tpr_members set reward10_at = coalesce(reward10_at, now()), updated_at = now() where id = m.id returning * into m;
    elsif (p_args->>'level') = '20' and m.sessions >= 20 then
      update public.tpr_members set reward20_at = coalesce(reward20_at, now()), updated_at = now() where id = m.id returning * into m;
    else return jsonb_build_object('error', 'not_reached'); end if;
    insert into public.tpr_log (member_id, action, delta, note) values (m.id, 'reward', 0, 'reward ' || (p_args->>'level') || ' given');
    return jsonb_build_object('member', public.tpr_member_json(m), 'changed', true);
  elsif p_action = 'edit' then
    if coalesce(trim(p_args->>'name'), '') = '' then return jsonb_build_object('error', 'name_required'); end if;
    update public.tpr_members set name = trim(p_args->>'name'), phone = nullif(trim(p_args->>'phone'), ''),
      email = nullif(trim(p_args->>'email'), ''), updated_at = now() where id = m.id returning * into m;
    return jsonb_build_object('member', public.tpr_member_json(m), 'changed', true);
  elsif p_action = 'archive' then
    update public.tpr_members set archived = true, updated_at = now() where id = m.id returning * into m;
    return jsonb_build_object('member', public.tpr_member_json(m));
  end if;
  raise exception 'bad action';
end $$;
revoke all on function public.tpr_staff(text, text, text, jsonb) from public;
grant execute on function public.tpr_staff(text, text, text, jsonb) to anon, authenticated;

-- coach-only setup (signed in to the tracker as a coach)
create or replace function public.tpr_admin(p_action text, p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_action = 'status' then
    return jsonb_build_object('has_pin', public.tpr_cfg('tpr_pin_hash') is not null,
      'has_cert', public.tpr_cfg('tpr_pass_cert') is not null and public.tpr_cfg('tpr_pass_key') is not null,
      'has_pending_key', public.tpr_cfg('tpr_pending_key') is not null,
      'pass_type_id', public.tpr_cfg('tpr_pass_type_id'), 'team_id', public.tpr_cfg('tpr_team_id'),
      'members', (select count(*) from public.tpr_members where not archived));
  elsif p_action = 'secret' then
    return jsonb_build_object('secret', public.tpr_cfg('tpr_secret'));
  elsif p_action = 'set_pin' then
    if coalesce(length(p_args->>'pin'), 0) < 6 then return jsonb_build_object('error', 'pin_too_short'); end if;
    insert into public.private_config (key, value) values ('tpr_pin_hash', crypt(p_args->>'pin', gen_salt('bf')))
      on conflict (key) do update set value = excluded.value;
    delete from public.tpr_pin_fails where true;
    return jsonb_build_object('ok', true);
  elsif p_action = 'store_pending_key' then
    insert into public.private_config (key, value) values ('tpr_pending_key', p_args->>'key')
      on conflict (key) do update set value = excluded.value;
    return jsonb_build_object('ok', true);
  elsif p_action = 'pending_key' then
    return jsonb_build_object('key', public.tpr_cfg('tpr_pending_key'));
  elsif p_action = 'store_cert' then
    if public.tpr_cfg('tpr_pending_key') is null then return jsonb_build_object('error', 'no_pending_key'); end if;
    insert into public.private_config (key, value) values
      ('tpr_pass_key', public.tpr_cfg('tpr_pending_key')), ('tpr_pass_cert', p_args->>'cert'),
      ('tpr_pass_type_id', p_args->>'pass_type_id'), ('tpr_team_id', p_args->>'team_id')
      on conflict (key) do update set value = excluded.value;
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'bad action';
end $$;
revoke all on function public.tpr_admin(text, jsonb) from public, anon;
grant execute on function public.tpr_admin(text, jsonb) to authenticated;
