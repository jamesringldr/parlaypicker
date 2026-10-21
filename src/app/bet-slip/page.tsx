import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar } from "@/components/avatar";
import { ErrorBanner } from "@/components/error-banner";
import type { SlipStatus } from "@/lib/betslip";
import { getBetSlip, type Scorer } from "@/lib/live/betslip";
import { getAvatarMarks, marksOf, type Marks } from "@/lib/live/players";
import { formatRecord } from "@/lib/players";
import { LIVE_PATH } from "@/lib/live/board";
import { canFinalize, getSessionViewer } from "@/lib/slip/store";
import { formatPrice, toWin } from "@/lib/rules";
import { FinalizeButton } from "./finalize-button";

export const metadata: Metadata = { title: "Bet Slips | Low-T Parlay", robots: { index: false, follow: false } };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const BADGE: Record<SlipStatus, { text: string; className: string }> = {
  hit: { text: "Hit", className: "bg-emerald-950/70 text-emerald-300" },
  miss: { text: "Miss", className: "bg-red-950/70 text-red-300" },
  push: { text: "Push", className: "bg-zinc-800 text-zinc-300" },
  open: { text: "Open", className: "bg-blue-950/70 text-blue-300" },
  missing: { text: "Missing Pick", className: "bg-amber-950/70 text-amber-300" },
};

const hrefFor = (week: number, current: number) => (week === current ? "/bet-slip" : `/bet-slip?week=${week}`);

function WeekNav({ weeks, selected, current, drafting }: { weeks: number[]; selected: number; current: number; drafting: boolean }) {
  const i = weeks.indexOf(selected);
  const prev = weeks[i - 1];
  const next = weeks[i + 1];
  const arrow = "flex size-9 items-center justify-center rounded-full border border-zinc-700";
  return (
    <div className="flex items-center justify-between gap-3">
      {prev ? (
        <Link href={hrefFor(prev, current)} aria-label={`Week ${prev}`} className={`${arrow} hover:bg-zinc-800`}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : (
        <span className={`${arrow} opacity-30`} aria-hidden>
          <ChevronLeft className="size-5" />
        </span>
      )}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">Week {selected}</h2>
        <p className="text-xs uppercase tracking-widest text-zinc-400">{selected !== current ? "Final" : drafting ? "Picks open" : "This week"}</p>
      </div>
      {next ? (
        <Link href={hrefFor(next, current)} aria-label={`Week ${next}`} className={`${arrow} hover:bg-zinc-800`}>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      ) : (
        <span className={`${arrow} opacity-30`} aria-hidden>
          <ChevronRight className="size-5" />
        </span>
      )}
    </div>
  );
}

function Scorers({ label, tone, people, marks }: { label: string; tone: string; people: Scorer[]; marks: Map<string, Marks> }) {
  return (
    <div className="min-w-0">
      <p className={`label !mb-1 ${tone}`}>{label}</p>
      {people.length === 0 ? (
        <p className="text-sm text-zinc-500">-</p>
      ) : (
        people.map((p) => (
          <Link key={p.slug} href={`/${p.slug}`} className="flex items-center gap-2 hover:opacity-80">
            <Avatar name={p.name} photoUrl={p.photoUrl} className="size-7 text-xs" {...marksOf(marks, p.slug)} badgeClass="text-xs" />
            <span className="truncate text-sm font-semibold">{p.name}</span>
          </Link>
        ))
      )}
    </div>
  );
}

export default async function BetSlipPage(props: PageProps<"/bet-slip">) {
  await connection();
  const { week } = await props.searchParams;
  const requested = typeof week === "string" && /^\d+$/.test(week) ? Number(week) : null;
  const [slip, marks] = await Promise.all([getBetSlip(requested), getAvatarMarks()]);
  const viewer = await getSessionViewer();
  const myRow = slip.rows.find((r) => r.slug === viewer?.slug);

  const decided = slip.record ? slip.record.wins + slip.record.losses : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      {!slip.closed && <AutoRefresh />}
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Bet Slips</h1>
        {/* While picks are open the button is about your pick; once the slip is final it's the live board. */}
        <Link href={slip.drafting ? "/games" : LIVE_PATH} className="btn shrink-0">
          {slip.drafting ? (myRow?.status === "missing" ? "Make Pick" : "Edit Pick") : "Live Board"}
        </Link>
      </header>

      <ErrorBanner searchParams={props.searchParams} />

      <WeekNav weeks={slip.weeks} selected={slip.selected} current={slip.current} drafting={slip.drafting} />

      <section className="card flex flex-col gap-4">
        {slip.closed && slip.record ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="label !mb-1">W-L-P</p>
              <p className="text-xl font-bold">{formatRecord(slip.record)}</p>
              <p className="text-xs text-zinc-400">{decided === 0 ? "-" : `${Math.round((slip.record.wins / decided) * 100)}%`} hit</p>
            </div>
            <div>
              <p className="label !mb-1">Odds</p>
              <p className="text-xl font-bold">{slip.totalPrice === null ? "-" : formatPrice(slip.totalPrice)}</p>
            </div>
            <div>
              <p className="label !mb-1">To win</p>
              <p className="text-xl font-bold text-emerald-400">
                {slip.totalPrice === null ? "-" : money.format(toWin(slip.totalPrice))}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-300">
            <span className="text-xl font-bold text-zinc-100">{slip.picksIn}</span> of {slip.total} picks in
            {slip.picksIn < slip.total && <span className="text-amber-300"> · {slip.total - slip.picksIn} missing</span>}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
          <Scorers label="High scorer" tone="!text-emerald-400" people={slip.high} marks={marks} />
          <Scorers label="Low scorer" tone="!text-red-400" people={slip.low} marks={marks} />
        </div>
      </section>

      {slip.drafting && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm text-zinc-300">
            Picks are open. An admin finalizes the slip, which puts it on the live board.
          </p>
          {viewer && myRow?.status === "missing" && (
            <Link href="/games" className="btn">
              Make your pick
            </Link>
          )}
          {viewer && canFinalize(viewer.role) && <FinalizeButton missing={slip.total - slip.picksIn} />}
        </div>
      )}

      <ul className="card !p-0">
        {slip.rows.map((row) => {
          const badge = BADGE[row.status];
          return (
            <li key={row.key} className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 last:border-b-0">
              <Link href={`/${row.slug}`} className="shrink-0">
                <Avatar name={row.name} photoUrl={slip.photos.get(row.slug) ?? null} className="size-10 text-base" {...marksOf(marks, row.slug)} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{row.name}</p>
                {row.leg ? (
                  <>
                    <p className="truncate text-sm text-zinc-200">
                      {row.leg.label}
                      {row.leg.price !== undefined && <span className="ml-2 text-zinc-500">{formatPrice(row.leg.price)}</span>}
                    </p>
                    {row.leg.matchup && <p className="truncate text-xs text-zinc-500">{row.leg.matchup}</p>}
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">No pick yet</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.text}</span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
