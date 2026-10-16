-- When each player signed in and was last seen, for the super admin's Activity page.
alter table public.player_profiles
  add column first_login_at timestamptz,
  add column last_login_at timestamptz,
  add column last_seen_at timestamptz,
  add column login_count integer not null default 0;
