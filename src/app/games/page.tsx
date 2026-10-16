import type { Metadata } from "next";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/auto-refresh";
import type { GameCard, Price, Side } from "@/lib/games/espn-games";
import { getNflWeek, REGULAR_SEASON_WEEKS, type NflWeek } from "@/lib/games/nfl";
import { formatPrice } from "@/lib/rules";

export const metadata: Metadata = { title: "Games | Low-T Parlay", robots: { index: false, follow: false } };

// "Sun 10/18 8:30am", in Central time like the rest of the site.
function kickoffLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("month")}/${get("day")} ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase()}`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// One tappable-looking line: the number on top, the price under it.
function Line({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="w-[4.1rem] shrink-0 rounded-lg bg-zinc-800 py-1.5 text-center">
      <p className="text-sm font-bold leading-tight">{top}</p>
      <p className="text-xs leading-tight text-zinc-400">{bottom}</p>
    </div>
  );
}

const spreadLine = (p: Price | null) =>
  p ? <Line top={p.line === null ? "-" : signed(p.line)} bottom={formatPrice(p.odds)} /> : <Line top="-" bottom="" />;

const totalLine = (p: Price | null, prefix: "o" | "u") =>
  p ? <Line top={p.line === null ? "-" : `${prefix}${p.line}`} bottom={formatPrice(p.odds)} /> : <Line top="-" bottom="" />;

const mlLine = (odds: number | null) =>
  odds === null ? <Line top="-" bottom="" /> : <Line top={formatPrice(odds)} bottom="ML" />;

function TeamRow({ side, game, which }: { side: Side; game: GameCard; which: "away" | "home" }) {
  const { lines, state } = game;
  const open = lines?.open;
  // Before kickoff the left column is where the lines opened: the favorite's spread on its row, the total on the other.
  const openText =
    !open || state !== "pre"
      ? ""
      : open.favorite === which && open.spread !== null
        ? signed(open.spread)
        : open.favorite !== null && open.favorite !== which && open.total !== null
          ? String(open.total)
          : "";

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={side.logo} alt="" className="size-10 shrink-0 object-contain" loading="lazy" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight">{side.abbr}</p>
          {side.record && <p className="text-xs leading-tight text-zinc-400">{side.record}</p>}
        </div>
      </div>
      {state === "pre" ? (
        <>
          <p className="w-10 shrink-0 text-center text-sm text-zinc-400">{openText}</p>
          {lines && (
            <div className="flex gap-1.5">
              {spreadLine(lines.spread[which])}
              {totalLine(which === "away" ? lines.total.over : lines.total.under, which === "away" ? "o" : "u")}
              {mlLine(lines.moneyline[which])}
            </div>
          )}
        </>
      ) : (
        <p className="shrink-0 pr-2 text-2xl font-bold tabular-nums">{side.score ?? "-"}</p>
      )}
    </div>
  );
}

function Card({ game }: { game: GameCard }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <TeamRow side={game.away} game={game} which="away" />
      <TeamRow side={game.home} game={game} which="home" />
      <p className="text-sm text-zinc-400">
        {game.state === "pre" ? kickoffLabel(game.kickoff) : game.state === "in" ? <span className="font-semibold text-emerald-400">{game.detail}</span> : game.detail}
      </p>
    </article>
  );
}

function Section({ title, games, open }: { title: string; games: GameCard[]; open: boolean }) {
  if (games.length === 0) return null;
  return (
    <details open={open} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2 [&::-webkit-details-marker]:hidden">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <ChevronDown className="size-5 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3">
        {games.map((g) => (
          <Card key={g.id} game={g} />
        ))}
      </div>
    </details>
  );
}

const TABS = [
  { key: "nfl", label: "NFL", href: "/games" },
  { key: "ncaa", label: "NCAA", href: "/games?sport=ncaa" },
];

// Only Game Lines is live. The prop tabs need FanDuel's player markets, which come from the paid Odds API.
const MARKETS = ["Game Lines", "SGPs", "TDs", "Passing", "Rushing", "Receiving"];

function WeekNav({ week }: { week: number }) {
  const arrow = "flex h-12 w-12 shrink-0 items-center justify-center text-zinc-300";
  return (
    <div className="flex items-center rounded-full border border-zinc-700">
      {week > 1 ? (
        <Link href={`/games?week=${week - 1}`} aria-label={`Week ${week - 1}`} className={`${arrow} hover:text-white`}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : (
        <span className={`${arrow} opacity-30`} aria-hidden>
          <ChevronLeft className="size-5" />
        </span>
      )}
      <p className="flex flex-1 items-center justify-center gap-2 text-lg font-semibold">
        <CalendarDays className="size-5" aria-hidden />
        Week {week}
      </p>
      {week < REGULAR_SEASON_WEEKS ? (
        <Link href={`/games?week=${week + 1}`} aria-label={`Week ${week + 1}`} className={`${arrow} hover:text-white`}>
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

export default async function Games(props: PageProps<"/games">) {
  await connection();
  const { sport, week } = await props.searchParams;
  const ncaa = sport === "ncaa";
  const requested = typeof week === "string" && /^\d+$/.test(week) ? Number(week) : null;

  let data: NflWeek | null = null;
  let error: string | null = null;
  if (!ncaa) {
    try {
      data = await getNflWeek(requested !== null && requested >= 1 && requested <= REGULAR_SEASON_WEEKS ? requested : null);
    } catch (e) {
      error = e instanceof Error ? e.message : "Couldn't load the games.";
    }
  }

  const games = data?.games ?? [];
  const live = games.filter((g) => g.state === "in");
  const upcoming = games.filter((g) => g.state === "pre");
  const final = games.filter((g) => g.state === "post");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      {live.length > 0 && <AutoRefresh />}

      <nav className="flex gap-1 rounded-xl bg-zinc-900 p-1" aria-label="League">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            replace
            aria-current={(ncaa ? "ncaa" : "nfl") === t.key ? "page" : undefined}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold ${
              (ncaa ? "ncaa" : "nfl") === t.key ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {ncaa ? (
        <p className="card text-sm text-zinc-400">College lines are coming next.</p>
      ) : (
        <>
          <div className="-mx-4 flex gap-6 overflow-x-auto border-b border-zinc-800 px-4">
            {MARKETS.map((m, i) => (
              <span
                key={m}
                title={i === 0 ? undefined : "Coming soon"}
                className={`shrink-0 whitespace-nowrap border-b-4 pb-3 text-lg font-semibold ${
                  i === 0 ? "border-emerald-500 text-zinc-50" : "border-transparent text-zinc-600"
                }`}
              >
                {m}
              </span>
            ))}
          </div>

          {data && <WeekNav week={data.week} />}
          {error && <p className="card text-sm text-amber-300">Games are unavailable right now ({error}).</p>}
          {data && games.length === 0 && <p className="card text-sm text-zinc-400">No games this week.</p>}

          <Section title="Live" games={live} open />
          <Section title="Upcoming" games={upcoming} open />
          <Section title="Final" games={final} open={live.length === 0 && upcoming.length === 0} />
          {games.some((g) => g.lines) && (
            <p className="text-center text-xs text-zinc-500">Lines from DraftKings via ESPN. FanDuel&apos;s can differ.</p>
          )}
        </>
      )}
    </main>
  );
}
