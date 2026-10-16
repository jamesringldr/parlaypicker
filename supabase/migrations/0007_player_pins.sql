-- Name-and-PIN sign-in. Only a salted hash of the PIN is stored. Five wrong tries lock the name for a while.
alter table public.player_profiles
  add column pin_hash text,
  add column failed_attempts integer not null default 0,
  add column locked_until timestamptz;
