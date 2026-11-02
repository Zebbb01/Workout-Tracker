-- Body Tracker schema.
--
-- Every row belongs to one Supabase Auth user, and Row Level Security limits
-- each user to their own rows. Ids are uuids made on the phone, so an entry
-- saved offline keeps its id when it syncs. updated_at is set here, never by
-- the phone, so "changes since" pulls see every write. A delete on the phone
-- sets deleted_at, so the user's other devices learn about it.

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  goal text not null default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  sex text check (sex in ('male', 'female')),
  age int check (age between 13 and 110),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  activity text not null default 'moderate'
    check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  calories int check (calories between 800 and 8000),
  protein_g int check (protein_g between 0 and 1000),
  carbs_g int check (carbs_g between 0 and 1500),
  fat_g int check (fat_g between 0 and 500),
  onboarded_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Built-in exercises live in the app; this holds the ones a person adds.
create table public.exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  category text not null default 'Other' check (char_length(category) between 1 and 30),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- One row per set. Weight is always stored in kg; the app shows the person's units.
create table public.workout_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 60),
  exercise_name text not null check (char_length(exercise_name) between 1 and 60),
  weight_kg numeric(7, 3) not null default 0 check (weight_kg between 0 and 1000),
  reps int not null check (reps between 1 and 1000),
  performed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.meals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  calories int not null default 0 check (calories between 0 and 10000),
  protein_g numeric(6, 1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g between 0 and 1500),
  fat_g numeric(6, 1) not null default 0 check (fat_g between 0 and 500),
  -- How the numbers were filled in. AI estimates are always checked by the person before saving.
  source text not null default 'manual' check (source in ('manual', 'photo', 'text')),
  eaten_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.weight_entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  weight_kg numeric(6, 2) not null check (weight_kg between 20 and 400),
  measured_on date not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.fasts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz check (ended_at is null or ended_at >= started_at),
  target_hours int not null default 16 check (target_hours between 1 and 72),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- The same trigger, policy, grants and pull index on every synced table.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'exercises', 'workout_sets', 'meals', 'weight_entries', 'fasts'] loop
    execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('create index %I on public.%I (user_id, updated_at)', t || '_changes', t);
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "Own rows only" on public.%I for all to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)$p$, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- AI estimates: a daily allowance per person, so one visitor cannot use up
-- the free model quota for everyone. Only the function below touches it.
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Counts one estimate for the signed-in person; false once today's allowance is used.
create function public.use_ai_estimate() returns boolean
language sql security definer set search_path = '' as $$
  insert into public.ai_usage as u (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
  returning count <= 25;
$$;
revoke execute on function public.use_ai_estimate() from public, anon;
grant execute on function public.use_ai_estimate() to authenticated;

-- Lets a person delete their account; every table cascades from auth.users.
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- A cheap call for the keep-awake job, so the free project is never paused.
create function public.ping() returns text
language sql stable set search_path = '' as $$ select 'ok' $$;
grant execute on function public.ping() to anon;

-- "Try it without an account" users who never saved their data with Google
-- are removed after 30 days, with everything they logged.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule(
  'delete-stale-anonymous-users',
  '17 3 * * *',
  $$delete from auth.users where is_anonymous and created_at < now() - interval '30 days'$$
);
