-- The week's draft bet slip. Each player makes one pick from the Games tab; an admin finalizes the
-- slip, which copies the picks onto the live board.
-- RLS on with no policies: only the server (secret key) can read or write them.
create table public.slip_picks (
  week_number integer not null,
  slug text not null,
  leg jsonb not null,
  -- Two picks can't share a conflict key in a week: the same game and bet type (either side), or the
  -- same player and stat. See src/lib/slip/legs.ts.
  conflict_key text not null,
  updated_at timestamptz not null default now(),
  primary key (week_number, slug),
  constraint slip_picks_no_conflict unique (week_number, conflict_key)
);

-- A row here means the week's slip is final and no more picks are taken.
create table public.slip_weeks (
  week_number integer primary key,
  finalized_at timestamptz not null default now(),
  finalized_by text not null
);

alter table public.slip_picks enable row level security;
alter table public.slip_weeks enable row level security;
