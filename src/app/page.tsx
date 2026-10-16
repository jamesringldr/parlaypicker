import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { getPastWeeks } from "@/lib/live/board";
import { getRoster } from "@/lib/live/players";
import { formatRecord, tally } from "@/lib/players";
import { toDecimal } from "@/lib/rules";
import { bestAndWorstWeek, extremes, standings, summarizeWeeks, type Standing } from "@/lib/stats";

// The group always bets $5.
const STAKE = 5;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const percent = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 100)}%`);

export const metadata: Metadata = { title: "Low-T Parlay", robots: { index: false, follow: false } };

function PickerCard({
  title,
  tone,
  rows,
  photos,
}: {
  title: string;
  tone: string;
  rows: Standing[];
  photos: Map<string, string | null>;
}) {
  return (
    <section className="card flex flex-col gap-2">
      <h2 className={`label !mb-0 ${tone}`}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Nobody yet.</p>
      ) : (
        rows.map((r) => (
          <Link key={r.slug} href={`/${r.slug}`} className="flex items-center gap-3 hover:opacity-80">
            <Avatar name={r.name} photoUrl={photos.get(r.slug) ?? null} className="size-12 text-lg" />
            <div className="min-w-0">
              <p className="truncate font-bold">{r.name}</p>
              <p className="text-xs text-zinc-400">
                {formatRecord(r.record)} · {percent(r.rate)}
              </p>
            </div>
          </Link>
        ))
      )}
    </section>
  );
}

export default async function Home() {
  await connection();
  const [weeks, roster] = await Promise.all([getPastWeeks(), getRoster()]);
  const photos = new Map(roster.map((p) => [p.slug, p.photoUrl]));

  const results = weeks.map((w) => ({ weekNumber: w.weekNumber, totalPrice: w.totalPrice, legs: w.legs }));
  const rows = standings(results);
  const { best, worst } = extremes(rows);
  const summaries = summarizeWeeks(results);
  const { best: bestWeek, worst: worstWeek } = bestAndWorstWeek(summaries);

  const legRecord = tally(weeks.flatMap((w) => w.legs.map((l) => l.result)));
  const decided = legRecord.wins + legRecord.losses;
  const wonWeeks = summaries.filter((s) => s.won).length;
  // A lost week costs the stake. A won week pays the profit at the total odds, when we have them.
  const net = weeks.reduce((sum, w, i) => {
    if (!summaries[i].won) return sum - STAKE;
    return w.totalPrice === null ? sum : sum + STAKE * (toDecimal(w.totalPrice) - 1);
  }, 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">
          Low-T <span className="text-emerald-400">Parlay</span>
        </h1>
        <p className="text-sm text-zinc-500">
          {weeks.length} week{weeks.length === 1 ? "" : "s"} played
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <section className="card">
          <p className="label">Parlays (W-L)</p>
          <p className="text-3xl font-bold tracking-tight">
            {wonWeeks}-{summaries.length - wonWeeks}
          </p>
          <p className={`text-sm font-semibold ${net < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {net < 0 ? "Down" : "Up"} {money.format(Math.abs(net))}
          </p>
        </section>
        <section className="card">
          <p className="label">Legs (W-L-P)</p>
          <p className="text-3xl font-bold tracking-tight">{formatRecord(legRecord)}</p>
          <p className="text-sm text-zinc-400">{decided === 0 ? "-" : percent(legRecord.wins / decided)} hit rate</p>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PickerCard title="Best picker" tone="!text-emerald-400" rows={best} photos={photos} />
        <PickerCard title="Worst picker" tone="!text-red-400" rows={worst} photos={photos} />
      </div>

      {bestWeek && worstWeek && (
        <div className="grid grid-cols-2 gap-3">
          <section className="card">
            <p className="label">Best week</p>
            <p className="font-bold">Week {bestWeek.weekNumber}</p>
            <p className="text-xs text-zinc-400">
              {bestWeek.hits} of {bestWeek.total} legs hit
            </p>
          </section>
          <section className="card">
            <p className="label">Worst week</p>
            <p className="font-bold">Week {worstWeek.weekNumber}</p>
            <p className="text-xs text-zinc-400">
              {worstWeek.hits} of {worstWeek.total} legs hit
            </p>
          </section>
        </div>
      )}

      <section className="card">
        <h2 className="label">Leaderboard</h2>
        <ol>
          {rows.map((r, i) => (
            <li key={r.slug}>
              <Link href={`/${r.slug}`} className="flex items-center gap-3 border-b border-zinc-800 py-2 last:border-b-0 hover:opacity-80">
                <span className="w-5 text-center text-sm font-semibold text-zinc-500">{i + 1}</span>
                <Avatar name={r.name} photoUrl={photos.get(r.slug) ?? null} className="size-9 text-sm" />
                <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                <span className="text-sm text-zinc-400">{formatRecord(r.record)}</span>
                <span className="w-10 text-right text-sm font-bold">{percent(r.rate)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <Link href="/live-board/past-weeks" className="text-center text-sm text-blue-400 hover:underline">
        Every week&apos;s parlay
      </Link>
    </main>
  );
}
