-- Extras for the player profile pages (/<slug>). The roster itself lives in src/lib/players.ts.
-- RLS on with no policies: only the server (secret key) reads or writes these.
create table public.player_profiles (
  slug text primary key,
  fantasy_name text,
  photo_url text
);

-- Fantasy high and low scorer for a week. Not every week has to be filled in.
create table public.player_weeks (
  week_number integer not null,
  slug text not null,
  role text not null check (role in ('high', 'low')),
  primary key (week_number, slug)
);

alter table public.player_profiles enable row level security;
alter table public.player_weeks enable row level security;
