import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getPastWeeks, LIVE_PATH, type ArchivedLeg } from "@/lib/live/board";
import { formatPrice, toDecimal } from "@/lib/rules";

// The group always bets $5.
const STAKE = 5;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const metadata: Metadata = {
  title: "Low-T Parlay Past Weeks",
  robots: { index: false, follow: false },
};

const RESULT = {
  hit: { text: "Hit", className: "text-emerald-400" },
  miss: { text: "Missed", className: "text-red-400" },
  push: { text: "Push", className: "text-zinc-300" },
};

// "2026-10-04" as a calendar date, not a moment, so no timezone shifts it.
function weekTitle(weekOf: string) {
  const [y, m, d] = weekOf.split("-").map(Number);
  return `Week of ${new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
}

function LegLine({ leg }: { leg: ArchivedLeg }) {
  const result = RESULT[leg.result];
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-zinc-800 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-semibold">{leg.label}</p>
        <p className="truncate text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">{leg.owner}</span> · {leg.matchup ?? leg.market}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold ${result.className}`}>{result.text}</p>
        {leg.price !== undefined && <p className="text-xs text-zinc-400">{formatPrice(leg.price)}</p>}
      </div>
    </li>
  );
}

export default async function PastWeeks() {
  await connection();
  const weeks = await getPastWeeks();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          Past <span className="text-emerald-400">Weeks</span>
        </h1>
        <Link href={LIVE_PATH} className="text-sm text-blue-400 hover:underline">
          Live board
        </Link>
      </header>

      {weeks.length === 0 && <p className="card text-sm text-zinc-400">No finished weeks yet.</p>}

      {weeks.map((week) => {
        const won = week.legs.every((l) => l.result !== "miss");
        const hits = week.legs.filter((l) => l.result === "hit").length;
        const profit = week.totalPrice === null ? null : Math.round(STAKE * (toDecimal(week.totalPrice) - 1) * 100) / 100;
        return (
          <section key={week.id} className="card flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-bold">{weekTitle(week.weekOf)}</h2>
              <p className={`font-bold ${won ? "text-emerald-400" : "text-red-400"}`}>
                {won ? (profit === null ? "Hit 🎉" : `Won ${money.format(profit)} 🎉`) : "Lost"}
              </p>
            </div>
            <p className="text-xs text-zinc-400">
              {hits} of {week.legs.length} legs hit
              {week.totalPrice !== null && <> · {formatPrice(week.totalPrice)}</>}
            </p>
            <ul>
              {week.legs.map((leg) => (
                <LegLine key={leg.id} leg={leg} />
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
