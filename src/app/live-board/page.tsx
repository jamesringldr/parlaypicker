import { connection } from "next/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocalTime } from "@/components/local-time";
import { getLegs } from "@/lib/live/board";
import { gradeLeg, parlayState, type LegState } from "@/lib/live/grade";
import { getScores } from "@/lib/live/scores";
import { formatPrice, parlayPrice } from "@/lib/rules";

export const metadata = { title: "Live Parlay", robots: { index: false, follow: false } };

const BADGE: Record<LegState, { text: string; className: string }> = {
  pending: { text: "Pending", className: "bg-zinc-800 text-zinc-300" },
  winning: { text: "Winning", className: "bg-emerald-900/60 text-emerald-300" },
  losing: { text: "Losing", className: "bg-amber-900/60 text-amber-300" },
  hit: { text: "Hit", className: "bg-emerald-500 text-zinc-950" },
  miss: { text: "Missed", className: "bg-red-500 text-zinc-950" },
  push: { text: "Push", className: "bg-zinc-600 text-zinc-100" },
};

const BANNER = {
  alive: null,
  dead: { text: "Parlay is dead.", className: "border-red-500/40 bg-red-950/40 text-red-200" },
  won: { text: "Parlay hit! 🎉", className: "border-emerald-500/40 bg-emerald-950/40 text-emerald-200" },
};

export default async function LiveParlay() {
  await connection();

  const legs = await getLegs();
  const { scores, error } = await getScores(legs);
  const graded = legs.map((leg) => ({
    leg,
    grade: gradeLeg(leg, leg.eventId ? scores.get(leg.eventId) : undefined),
  }));

  const state = parlayState(graded.map((g) => g.grade));
  const banner = BANNER[state];
  const hits = graded.filter((g) => g.grade.state === "hit").length;
  const priced = legs.flatMap((l) => (l.price === undefined ? [] : [l.price]));
  const combined = priced.length === legs.length ? parlayPrice(priced) : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <AutoRefresh />
      <header>
        <h1 className="text-xl font-bold tracking-tight">
          Live <span className="text-emerald-400">Parlay</span>
        </h1>
        <p className="text-sm text-zinc-500">
          {hits} of {legs.length} legs hit{combined !== null && <> · pays {formatPrice(combined)}</>} · updates every
          30s
        </p>
      </header>

      {banner && <div className={`rounded-xl border p-3 text-sm font-semibold ${banner.className}`}>{banner.text}</div>}
      {error && <p className="text-sm text-amber-300">Live scores are unavailable right now ({error}).</p>}
      {legs.length === 0 && <p className="card text-sm text-zinc-400">The parlay hasn&apos;t been posted yet.</p>}

      <ul className="flex flex-col gap-2">
        {graded.map(({ leg, grade }) => {
          const badge = BADGE[grade.state];
          return (
            <li key={leg.id} className="card flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{leg.owner}</p>
                <p className="font-semibold">
                  {leg.label}
                  {leg.price !== undefined && <span className="ml-2 text-zinc-500">{formatPrice(leg.price)}</span>}
                </p>
                {leg.matchup && (
                  <p className="text-sm text-zinc-500">
                    {leg.matchup}
                    {leg.commenceTime && (
                      <>
                        {" · "}
                        <LocalTime iso={leg.commenceTime} />
                      </>
                    )}
                  </p>
                )}
                <p className="text-sm text-zinc-400">{grade.detail}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                {badge.text}
              </span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
