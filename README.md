# Parlay Picker

A group builds one parlay together. The admin picks a **Better** for each parlay. Everyone else in the group is a **Picker** and adds exactly one leg.

## Rules

Enforced in Postgres (`supabase/migrations/0001_init.sql`), so the UI can't route around them:

- The Better can't pick.
- Each Picker gets one pick per parlay.
- No duplicate or opposite legs (`src/lib/rules.ts`):
  - **Moneyline, spread, total:** one leg per game per type. Chiefs -3.5 blocks alt Chiefs -7, Bills +3.5 and so on.
  - **Props:** one leg per player per stat. Mahomes pass yds O 275.5 blocks U 275.5 and O 300.5. A different player, or a different stat for the same player, is still open.
  - Different types on the same game (ML + total + props) are allowed.
- No picks on games that have started, and no picks once the admin locks the parlay.
- Only approved members can pick or view the parlay.
- Line and price are looked up on the server when a pick is submitted, never taken from the browser.

## Odds

Lines come from FanDuel through [The Odds API](https://the-odds-api.com/) (`src/lib/odds/the-odds-api.ts`). The game list is free. Opening a game costs one credit per market FanDuel actually returns: moneyline, spread, total, and the four prop types. Alt lines are not requested. A response is reused for 2 minutes, so the page view and the pick that follows share one fetch.

Set `ODDS_API_KEY` in `.env.local`. The feed is one national FanDuel line, and it can lag the phone app by a couple of minutes. The combined price on the home page is still this app's own math, not FanDuel's same-game parlay price.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor, or use `supabase link` then `supabase db push`.
3. Go to **Auth → Email Templates → Magic Link** and add `{{ .Token }}` to the body. Sign-in uses a 6-digit code instead of a link, because links break on phones.
4. `cp .env.example .env.local` and fill in the project URL, publishable key, secret key (**Project Settings → API Keys**), and `ODDS_API_KEY`.
5. `npm install && npm run dev`, then sign in once.
6. Make yourself admin and a member in the SQL editor:
   ```sql
   update public.profiles set is_admin = true, is_member = true where email = 'you@example.com';
   ```
7. Others sign in, then you approve them on `/admin`. From there you open a parlay and set the Better.

Deploy to Vercel with the same four env vars.

## Scripts

- `npm run dev`: local dev server
- `npm test`: unit tests for conflict rules and parlay odds math
- `npm run build`: production build
