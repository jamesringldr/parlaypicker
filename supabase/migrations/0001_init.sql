-- Parlay Picker schema.
-- Clients only read. All writes go through server actions using the secret
-- key, and the rules below hold no matter who writes.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  is_member boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.parlays (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  better_id uuid not null references public.profiles (id),
  status text not null default 'open' check (status in ('open', 'locked')),
  created_at timestamptz not null default now()
);

-- Only one open parlay at a time.
create unique index parlays_one_open on public.parlays ((true)) where status = 'open';

create table public.picks (
  id uuid primary key default gen_random_uuid(),
  parlay_id uuid not null references public.parlays (id) on delete cascade,
  picker_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null check (sport in ('nfl', 'ncaaf')),
  event_id text not null,
  home_team text not null,
  away_team text not null,
  commence_time timestamptz not null,
  market text not null,
  selection text not null,
  player text,
  point numeric,
  price integer not null,
  bookmaker text not null,
  conflict_key text not null,
  created_at timestamptz not null default now(),
  -- Pickers can only pick 1.
  constraint picks_one_per_picker unique (parlay_id, picker_id),
  -- No duplicate or opposite legs (see src/lib/rules.ts).
  constraint picks_no_conflict unique (parlay_id, conflict_key)
);

create function public.enforce_pick_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p public.parlays;
begin
  select * into p from public.parlays where id = new.parlay_id for share;

  if p.status <> 'open' then
    raise exception 'This parlay is locked.' using errcode = 'P0001';
  end if;
  if new.picker_id = p.better_id then
    raise exception 'The Better cannot make a pick.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = new.picker_id and is_member) then
    raise exception 'Only group members can pick.' using errcode = 'P0001';
  end if;
  if new.commence_time <= now() then
    raise exception 'That game has already started.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger picks_enforce_rules
  before insert on public.picks
  for each row execute function public.enforce_pick_rules();

create function public.enforce_better_has_no_pick()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.picks where parlay_id = new.id and picker_id = new.better_id) then
    raise exception 'That person already has a pick on this parlay. Remove it before making them the Better.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger parlays_better_has_no_pick
  before insert or update of better_id on public.parlays
  for each row execute function public.enforce_better_has_no_pick();

-- Read access -------------------------------------------------------------

create function public.can_view()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and (is_member or is_admin)
  );
$$;

alter table public.profiles enable row level security;
alter table public.parlays enable row level security;
alter table public.picks enable row level security;

create policy "view own profile or all if member" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.can_view()));

create policy "members view parlays" on public.parlays
  for select to authenticated
  using ((select public.can_view()));

create policy "members view picks" on public.picks
  for select to authenticated
  using ((select public.can_view()));

-- Live updates on the parlay page.
alter publication supabase_realtime add table public.picks, public.parlays;
