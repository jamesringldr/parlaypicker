-- Hand-entered parlay for the shared "track it live" page (/live/<slug>).
-- RLS on with no policies: only the server (secret key) can read or write it.
create table public.live_board (
  id text primary key,
  legs jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.live_board enable row level security;
