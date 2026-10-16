-- What each player is allowed to do. What each role can do is decided in code.
alter table public.player_profiles
  add column role text not null default 'user' check (role in ('user', 'bet_admin', 'super_admin'));
