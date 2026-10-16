-- The sign-in screen only asks for a PIN, so wrong tries are counted per visitor (IP address)
-- rather than per name. The per-name counters from 0007 go away.
create table public.login_attempts (
  ip text primary key,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);

alter table public.login_attempts enable row level security;

alter table public.player_profiles
  drop column failed_attempts,
  drop column locked_until;
