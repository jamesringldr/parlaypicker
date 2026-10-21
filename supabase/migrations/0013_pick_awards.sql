-- The best and worst pick of a week, shown as a bullseye or a puke face on the player's avatar. A week can
-- have several of either (a tie). Not every week has to be filled in.
create table public.pick_awards (
  week_number integer not null,
  slug text not null,
  kind text not null check (kind in ('best', 'worst')),
  primary key (week_number, slug)
);

alter table public.pick_awards enable row level security;
