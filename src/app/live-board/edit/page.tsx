import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ErrorBanner } from "@/components/error-banner";
import { getLegs, isAdminKey, LIVE_PATH } from "@/lib/live/board";
import { PROP_STATS } from "@/lib/live/grade";
import { oddsProvider } from "@/lib/odds";
import { formatPrice } from "@/lib/rules";
import { addLeg, markLeg, removeLeg } from "./actions";

export const metadata = { title: "Edit Live Parlay", robots: { index: false, follow: false } };

export default async function EditLive(props: PageProps<"/live-board/edit">) {
  await connection();
  const { key } = await props.searchParams;
  if (typeof key !== "string" || !isAdminKey(key)) notFound();

  const legs = await getLegs();
  let events: Awaited<ReturnType<typeof oddsProvider.listEvents>> = [];
  let eventsError: string | null = null;
  try {
    events = (await oddsProvider.listEvents("nfl")).sort((a, b) => a.commenceTime.localeCompare(b.commenceTime));
  } catch (error) {
    eventsError = error instanceof Error ? error.message : "Couldn't load games.";
  }

  const hidden = (
    <>
      <input type="hidden" name="key" value={key} />
    </>
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Edit live parlay</h1>
        <Link href={LIVE_PATH} className="btn-ghost">
          View page
        </Link>
      </header>
      <ErrorBanner searchParams={props.searchParams} />

      <ul className="flex flex-col gap-2">
        {legs.map((leg) => (
          <li key={leg.id} className="card flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{leg.owner}</p>
              <p className="font-semibold">
                {leg.label}
                {leg.price !== undefined && <span className="ml-2 text-zinc-500">{formatPrice(leg.price)}</span>}
              </p>
              {leg.matchup && <p className="text-sm text-zinc-500">{leg.matchup}</p>}
              <p className="text-sm text-zinc-400">
                Hand mark:{" "}
                {leg.manual ?? (leg.kind === "prop" && !leg.prop ? "none (this prop needs one)" : "none (auto)")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["hit", "miss", "push", "clear"] as const).map((result) => (
                <form key={result} action={markLeg}>
                  {hidden}
                  <input type="hidden" name="id" value={leg.id} />
                  <input type="hidden" name="result" value={result} />
                  <button className="btn-ghost capitalize">{result}</button>
                </form>
              ))}
              <form action={removeLeg}>
                {hidden}
                <input type="hidden" name="id" value={leg.id} />
                <button className="btn-ghost text-red-300">Remove</button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action={addLeg} className="card flex flex-col gap-3">
        {hidden}
        <h2 className="font-semibold">Add a leg</h2>
        {eventsError && <p className="text-sm text-red-300">{eventsError}</p>}

        <div>
          <label className="label" htmlFor="owner">
            Owner
          </label>
          <input id="owner" name="owner" className="input" placeholder="Name" required />
        </div>

        <div>
          <label className="label" htmlFor="kind">
            Type
          </label>
          <select id="kind" name="kind" className="input" defaultValue="moneyline">
            <option value="moneyline">Moneyline</option>
            <option value="spread">Spread</option>
            <option value="total">Total</option>
            <option value="prop">Player prop</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="eventId">
            Game (required unless it&apos;s a prop)
          </label>
          <select id="eventId" name="eventId" className="input" defaultValue="">
            <option value="">None</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.awayTeam} @ {e.homeTeam} ·{" "}
                {new Date(e.commenceTime).toLocaleString("en-US", {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })}{" "}
                ET
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="side">
              Side (props: the player&apos;s team)
            </label>
            <select id="side" name="side" className="input" defaultValue="">
              <option value="">—</option>
              <option value="home">Home team</option>
              <option value="away">Away team</option>
              <option value="over">Over</option>
              <option value="under">Under</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="point">
              Line (spread: signed for that team)
            </label>
            <input id="point" name="point" inputMode="decimal" className="input" placeholder="-3.5" />
          </div>
        </div>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Player props only
          </legend>
          <p className="text-xs text-zinc-500">
            Pick a stat and the page grades it from the box score. The line goes in the Line box above.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="stat">
                Stat
              </label>
              <select id="stat" name="stat" className="input" defaultValue="">
                <option value="">Hand-marked (fill in below)</option>
                {Object.entries(PROP_STATS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="direction">
                Over/Under (yards)
              </label>
              <select id="direction" name="direction" className="input" defaultValue="over">
                <option value="over">Over</option>
                <option value="under">Under</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="player">
              Player (as ESPN spells it)
            </label>
            <input id="player" name="player" className="input" placeholder="Josh Allen" />
          </div>
          <div>
            <label className="label" htmlFor="label">
              Hand-marked: player and line
            </label>
            <input id="label" name="label" className="input" placeholder="Patrick Mahomes Over 275.5" />
          </div>
          <div>
            <label className="label" htmlFor="market">
              Hand-marked: market
            </label>
            <input id="market" name="market" className="input" placeholder="Passing yds" />
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="price">
            Odds (American, optional)
          </label>
          <input id="price" name="price" inputMode="numeric" className="input" placeholder="-110" />
        </div>

        <button className="btn">Add leg</button>
      </form>
    </main>
  );
}
