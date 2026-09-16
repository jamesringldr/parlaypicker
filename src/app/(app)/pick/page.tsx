import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { oddsProvider } from "@/lib/odds";
import { SPORTS, isSport } from "@/lib/odds/types";
import { requirePicker } from "./eligibility";

export default async function PickGame(props: PageProps<"/pick">) {
  await requirePicker();
  const { sport: param } = await props.searchParams;
  const sport = isSport(param) ? param : "nfl";
  const events = await oddsProvider.listEvents(sport);
  const upcoming = events.filter((e) => new Date(e.commenceTime) > new Date());

  return (
    <main className="flex flex-col gap-4">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to parlay
      </Link>
      <h1 className="text-xl font-bold">Pick a game</h1>

      <div className="flex gap-2">
        {Object.entries(SPORTS).map(([key, { label }]) => (
          <Link
            key={key}
            href={`/pick?sport=${key}`}
            className={key === sport ? "btn" : "btn-ghost"}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {upcoming.length === 0 && <p className="text-sm text-zinc-500">No upcoming games.</p>}
        {upcoming.map((e) => (
          <Link
            key={e.id}
            href={`/pick/${encodeURIComponent(e.id)}?sport=${sport}`}
            className="card block hover:border-zinc-600"
          >
            <p className="font-semibold">
              {e.awayTeam} @ {e.homeTeam}
            </p>
            <p className="text-xs text-zinc-500">
              <LocalTime iso={e.commenceTime} />
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
