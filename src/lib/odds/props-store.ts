import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { PROP_TABS, type GameProps, type PlayerProp, type PropsSnapshot, type PropTab } from "./props";

const KEY = "nfl-props";

export async function getPropsSnapshot(): Promise<PropsSnapshot | null> {
  const { data, error } = await createAdminClient().from("odds_snapshots").select("fetched_at, data").eq("key", KEY).maybeSingle();
  if (error) throw new Error(`Couldn't load the props: ${error.message}`);
  if (!data) return null;
  const stored = data.data as Pick<PropsSnapshot, "games" | "creditsRemaining">;
  return { fetchedAt: data.fetched_at, games: stored.games, creditsRemaining: stored.creditsRemaining };
}

export async function savePropsSnapshot(snapshot: PropsSnapshot) {
  const { error } = await createAdminClient()
    .from("odds_snapshots")
    .upsert({
      key: KEY,
      fetched_at: snapshot.fetchedAt,
      data: { games: snapshot.games, creditsRemaining: snapshot.creditsRemaining },
    });
  if (error) throw new Error(`Couldn't save the props: ${error.message}`);
}

export interface TabProps {
  fetchedAt: string;
  // Games that haven't kicked off and have something to show on this tab, in kickoff order.
  games: { game: GameProps; rows: PlayerProp[] }[];
}

export async function getTabProps(tab: PropTab, now = Date.now()): Promise<TabProps | null> {
  const snapshot = await getPropsSnapshot();
  if (!snapshot) return null;
  const { market, yards } = PROP_TABS[tab];
  const games = snapshot.games
    .filter((g) => new Date(g.commenceTime).getTime() > now)
    .map((game) => {
      const rows = [...(game.markets[market] ?? [])];
      // Yardage: biggest lines first. TDs: likeliest scorer (shortest price) first.
      rows.sort(yards ? (a, b) => (b.point ?? 0) - (a.point ?? 0) : (a, b) => (a.yes ?? 0) - (b.yes ?? 0));
      return { game, rows };
    })
    .filter((g) => g.rows.length > 0)
    .sort((a, b) => a.game.commenceTime.localeCompare(b.game.commenceTime));
  return { fetchedAt: snapshot.fetchedAt, games };
}
