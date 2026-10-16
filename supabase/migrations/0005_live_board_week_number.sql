-- Past weeks are labeled "Week N". Existing rows get their number from date order.
alter table public.live_board_weeks add column week_number integer;
update public.live_board_weeks w set week_number = r.n
  from (select id, row_number() over (order by week_of) n from public.live_board_weeks) r
  where w.id = r.id;
alter table public.live_board_weeks alter column week_number set not null;
create unique index live_board_weeks_week_number on public.live_board_weeks (week_number);
