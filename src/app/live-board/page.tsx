import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { getBoard, LIVE_PATH } from "@/lib/live/board";
import { gradeLeg, parlayState, type Grade, type Leg, type LegKind, type LegState } from "@/lib/live/grade";
import { legLogos } from "@/lib/live/logos";
import { getScores } from "@/lib/live/scores";
import { formatPrice, parlayPrice, toDecimal } from "@/lib/rules";

// The group always bets $5.
const STAKE = 5;

// Central time ("CT" covers CDT and CST), same as the sportsbook shows.
const centralTime = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const metadata = { title: "Live Parlay", robots: { index: false, follow: false } };

const BANNER = {
  alive: null,
  dead: { text: "Parlay is dead.", className: "border-red-500/40 bg-red-950/40 text-red-200" },
  won: { text: "Parlay hit! 🎉", className: "border-emerald-500/40 bg-emerald-950/40 text-emerald-200" },
};

const KIND_LABEL: Record<LegKind, string> = {
  moneyline: "Moneyline",
  spread: "Spread",
  total: "Total",
  prop: "Player prop",
};

const STATUS_TEXT: Record<LegState, string> = {
  pending: "",
  winning: "Winning",
  losing: "Losing",
  hit: "Hit",
  miss: "Missed",
  push: "Push",
};

const STATUS_COLOR: Record<LegState, string> = {
  pending: "text-zinc-400",
  winning: "text-emerald-400",
  losing: "text-amber-400",
  hit: "text-emerald-400",
  miss: "text-red-400",
  push: "text-zinc-300",
};

const isSettled = (state: LegState) => state === "hit" || state === "miss" || state === "push";

// The circle on the timeline: empty until settled, then a check, X or dash.
function Marker({ state }: { state: LegState }) {
  const base = "relative z-10 mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-zinc-950";
  if (state === "hit")
    return (
      <span className={`${base} border-emerald-500 text-emerald-500`}>
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  if (state === "miss")
    return (
      <span className={`${base} border-red-500 text-red-500`}>
        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m4 4 8 8m0-8-8 8" strokeLinecap="round" />
        </svg>
      </span>
    );
  if (state === "push")
    return (
      <span className={`${base} border-zinc-500 text-zinc-400`}>
        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 8h8" strokeLinecap="round" />
        </svg>
      </span>
    );
  const ring = state === "winning" ? "border-emerald-500" : state === "losing" ? "border-amber-500" : "border-zinc-600";
  return <span className={`${base} ${ring}`} />;
}

function Logos({ urls }: { urls: string[] }) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
      {urls.length === 0 ? null : urls.length === 1 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls[0]} alt="" className="size-7 object-contain" loading="lazy" />
      ) : (
        <div className="flex -space-x-2">
          {urls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="size-5 object-contain" loading="lazy" />
          ))}
        </div>
      )}
    </div>
  );
}

function LegRow({ leg, grade, settled }: { leg: Leg; grade: Grade; settled: boolean }) {
  const accent = settled ? "text-zinc-100" : "text-blue-400";
  const status = STATUS_TEXT[grade.state];
  return (
    <li className="flex gap-3">
      <Marker state={grade.state} />
      <div className="min-w-0 flex-1 border-b border-zinc-800 py-3">
        <div className="flex items-center gap-3">
          <Logos urls={legLogos(leg)} />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-lg font-bold leading-tight ${accent}`}>{leg.label}</p>
            <p className="truncate text-xs font-medium uppercase tracking-widest text-zinc-400">
              {leg.market ?? KIND_LABEL[leg.kind]}
            </p>
          </div>
          {leg.price !== undefined && <p className="shrink-0 text-xl font-bold">{formatPrice(leg.price)}</p>}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3 text-sm">
          <p className={`min-w-0 truncate ${accent}`}>{leg.matchup ?? ""}</p>
          {leg.commenceTime && (
            <p className="shrink-0 text-xs uppercase tracking-wide text-zinc-400">
              {centralTime.format(new Date(leg.commenceTime))} CT
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">{leg.owner}</span>
          {status && <span className={`ml-2 font-semibold ${STATUS_COLOR[grade.state]}`}>{status}</span>}
          {grade.detail && <span className="ml-2">{grade.detail}</span>}
        </p>
      </div>
    </li>
  );
}

export default async function LiveParlay(props: PageProps<"/live-board">) {
  await connection();
  const { tab } = await props.searchParams;
  const view = tab === "settled" ? "settled" : "open";

  const { legs, totalPrice } = await getBoard();
  const { scores, error } = await getScores(legs);
  const graded = legs.map((leg) => ({
    leg,
    grade: gradeLeg(leg, leg.eventId ? scores.get(leg.eventId) : undefined),
  }));

  const state = parlayState(graded.map((g) => g.grade));
  const banner = BANNER[state];
  const hits = graded.filter((g) => g.grade.state === "hit").length;
  const priced = legs.flatMap((l) => (l.price === undefined ? [] : [l.price]));
  // A hand-entered total (the sportsbook's real price) beats our own math.
  const combined = totalPrice ?? (priced.length === legs.length ? parlayPrice(priced) : null);

  const open = graded.filter((g) => !isSettled(g.grade.state));
  const settled = graded.filter((g) => isSettled(g.grade.state));
  const shown = view === "settled" ? settled : open;
  const byKickoff = (a: (typeof graded)[number], b: (typeof graded)[number]) =>
    (a.leg.commenceTime ?? "").localeCompare(b.leg.commenceTime ?? "");

  // Profit on the stake, not the payout (which includes the stake back).
  const toWin = combined === null ? null : Math.round(STAKE * (toDecimal(combined) - 1) * 100) / 100;

  const tabs = [
    { key: "open", label: "Open", count: open.length, href: LIVE_PATH },
    { key: "settled", label: "Settled", count: settled.length, href: `${LIVE_PATH}?tab=settled` },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <AutoRefresh />
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            Live <span className="text-emerald-400">Parlay</span>
          </h1>
          {toWin !== null && (
            <p className="text-xl font-bold tracking-tight text-emerald-400">To Win: {money.format(toWin)}</p>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {hits} of {legs.length} legs hit{combined !== null && <> · pays {formatPrice(combined)}</>} · updates every
          30s
        </p>
      </header>

      {banner && <div className={`rounded-xl border p-3 text-sm font-semibold ${banner.className}`}>{banner.text}</div>}
      {error && <p className="text-sm text-amber-300">Live scores are unavailable right now ({error}).</p>}

      <nav className="flex gap-1 rounded-xl bg-zinc-900 p-1" aria-label="Legs">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            replace
            scroll={false}
            aria-current={view === t.key ? "page" : undefined}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold ${
              view === t.key ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label} ({t.count})
          </Link>
        ))}
      </nav>

      {legs.length === 0 && <p className="card text-sm text-zinc-400">The parlay hasn&apos;t been posted yet.</p>}
      {legs.length > 0 && shown.length === 0 && (
        <p className="card text-sm text-zinc-400">
          {view === "settled" ? "No legs have settled yet." : "Every leg has settled."}
        </p>
      )}

      <ul className="relative">
        {/* The timeline rail. The markers sit on top of it. */}
        {shown.length > 1 && <div className="absolute bottom-6 left-3 top-6 w-px bg-zinc-700" aria-hidden />}
        {[...shown].sort(byKickoff).map(({ leg, grade }) => (
          <LegRow key={leg.id} leg={leg} grade={grade} settled={view === "settled"} />
        ))}
      </ul>
    </main>
  );
}
