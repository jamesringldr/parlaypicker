-- The last props pull, stored whole. The Games tab reads this instead of calling the Odds API,
-- so what it costs depends on the pull schedule, not on how many people look.
create table public.odds_snapshots (
  key text primary key,
  fetched_at timestamptz not null default now(),
  data jsonb not null
);

alter table public.odds_snapshots enable row level security;
