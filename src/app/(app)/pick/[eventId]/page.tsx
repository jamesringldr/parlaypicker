import Link from "next/link";
import { notFound } from "next/navigation";
import { submitPick } from "@/app/actions";
import { ErrorBanner } from "@/components/error-banner";
import { LocalTime } from "@/components/local-time";
import { getProfiles } from "@/lib/data";
import { describeOutcome, marketLabel, oddsProvider } from "@/lib/odds";
import { isSport } from "@/lib/odds/types";
import { conflictKey, formatPrice } from "@/lib/rules";
import { requirePicker } from "../eligibility";

export default async function PickLeg(props: PageProps<"/pick/[eventId]">) {
  const { picks } = await requirePicker();
  const { eventId } = await props.params;
  const { sport } = await props.searchParams;
  if (!isSport(sport)) notFound();

  let event: Awaited<ReturnType<typeof oddsProvider.getEventOdds>>;
  try {
    event = await oddsProvider.getEventOdds(sport, decodeURIComponent(eventId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't load lines.";
    return (
      <main className="flex flex-col gap-4">
        <Link href={`/pick?sport=${sport}`} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← All games
        </Link>
        <p className="text-sm text-red-300">{message}</p>
      </main>
    );
  }
  const profiles = await getProfiles();
  if (!event) notFound();

  const nameOf = new Map(profiles.map((p) => [p.id, p.display_name]));
  const takenBy = new Map(picks.map((p) => [p.conflict_key, nameOf.get(p.picker_id)]));
  const started = new Date(event.commenceTime) <= new Date();

  return (
    <main className="flex flex-col gap-4">
      <Link href={`/pick?sport=${sport}`} className="text-sm text-zinc-400 hover:text-zinc-200">
        ← All games
      </Link>
      <div>
        <h1 className="text-xl font-bold">
          {event.awayTeam} @ {event.homeTeam}
        </h1>
        <p className="text-sm text-zinc-500">
          <LocalTime iso={event.commenceTime} />
        </p>
      </div>

      {event.markets.length === 0 && (
        <p className="text-sm text-zinc-500">FanDuel has no lines up for this game yet.</p>
      )}
      <ErrorBanner searchParams={props.searchParams} />
      {started && <p className="text-sm text-red-300">This game has started. Picks are closed.</p>}

      {event.markets.map((market, i) => (
        <section key={`${market.key}-${i}`} className="card">
          <h2 className="label">{marketLabel(market.key)}</h2>
          <div className="grid grid-cols-2 gap-2">
            {market.outcomes.map((o) => {
              const taker = takenBy.get(conflictKey(event.id, market.key, o));
              return (
                <form key={`${o.name}-${o.description}-${o.point}`} action={submitPick}>
                  <input type="hidden" name="sport" value={sport} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="market" value={market.key} />
                  <input type="hidden" name="name" value={o.name} />
                  <input type="hidden" name="description" value={o.description ?? ""} />
                  <input type="hidden" name="point" value={o.point ?? ""} />
                  <button
                    disabled={started || taker !== undefined}
                    className="flex w-full flex-col items-start rounded-lg border border-zinc-700 px-3 py-2 text-left hover:border-emerald-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:opacity-50"
                  >
                    <span className="text-sm font-medium">{describeOutcome(market.key, o)}</span>
                    <span className="font-mono text-sm text-emerald-400">{formatPrice(o.price)}</span>
                    {taker !== undefined && <span className="text-xs text-zinc-400">Blocked, {taker} has this</span>}
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
