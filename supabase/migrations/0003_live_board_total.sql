-- Optional hand-entered combined price (American odds) shown on the live page.
alter table public.live_board add column total_price integer;
