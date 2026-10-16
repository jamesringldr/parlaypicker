-- Finished weeks, frozen when the board is archived. Each leg carries its final result,
-- because ESPN only serves the current week's games.
create table public.live_board_weeks (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  legs jsonb not null,
  total_price integer,
  created_at timestamptz not null default now()
);

alter table public.live_board_weeks enable row level security;
