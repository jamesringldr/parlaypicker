import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { BoardAction } from "@/components/header-action";
import type { GameCard, Side } from "@/lib/games/espn-games";
import {
  CONFERENCES,
  getCollegeSlate,
  getNflSlate,
  isCollegeFilter,
  type CollegeFilter,
  type Slate,
} from "@/lib/games/scoreboard";
import { applyOpens } from "@/lib/games/opens";
import { getLineOpens } from "@/lib/games/opens-store";
import { formatMove, isMoveKind, sortByMovement, spreadMove, totalMove, type MoveKind } from "@/lib/games/movement";
import { findGameProps, isPropTab } from "@/lib/odds/props";
import { getUpcomingProps, type UpcomingProps } from "@/lib/odds/props-store";
import { formatPrice } from "@/lib/rules";
import type { PickSpec } from "@/lib/slip/legs";
import { GamesView, PlayersView, type TeamInfo, type VenueInfo } from "./props-view";
import { ForecastIcon } from "./forecast-icon";
import { PickLine } from "./pick-line";
import { kickoffShort, Line, signed } from "./shared";

export const metadata: Metadata = { title: "Lines | Low-T Parlay", robots: { index: false, follow: false } };

// Each price box is a pick button; the spec says which bet it is.
const spec = (game: GameCard, slate: string, kind: "moneyline" | "spread" | "total", side: "home" | "away" | "over" | "under", point: number | null): PickSpec => ({
  src: "game",
  slate,
  gameId: game.id,
  kind,
  side,
  point,
  away: game.away.name,
  home: game.home.name,
});

function Spread({ game, slate, which }: { game: GameCard; slate: string; which: "away" | "home" }) {
  const p = game.lines?.spread[which];
  if (!p || p.line === null) return <Line top="-" bottom="" />;
  return <PickLine spec={spec(game, slate, "spread", which, p.line)} top={signed(p.line)} bottom={formatPrice(p.odds)} />;
}

// The away row carries the over and the home row the under.
function Total({ game, slate, which }: { game: GameCard; slate: string; which: "away" | "home" }) {
  const over = which === "away";
  const p = over ? game.lines?.total.over : game.lines?.total.under;
  if (!p || p.line === null) return <Line top="-" bottom="" />;
  return <PickLine spec={spec(game, slate, "total", over ? "over" : "under", p.line)} top={`${over ? "o" : "u"}${p.line}`} bottom={formatPrice(p.odds)} />;
}

function Moneyline({ game, slate, which }: { game: GameCard; slate: string; which: "away" | "home" }) {
  const odds = game.lines?.moneyline[which] ?? null;
  if (odds === null) return <Line top="-" bottom="" />;
  return <PickLine spec={spec(game, slate, "moneyline", which, null)} top={formatPrice(odds)} bottom="ML" />;
}

function TeamRow({ side, game, which, slate }: { side: Side; game: GameCard; which: "away" | "home"; slate: string }) {
  const { lines, state } = game;
  const open = lines?.open;
  // Before kickoff the left column is where the lines opened, with how far each has moved since: the favorite's
  // spread on its row, the total on the other.
  const spreadRow = state === "pre" && !!lines && !!open && open.favorite === which && open.spread !== null;
  const totalRow = state === "pre" && !!lines && !!open && open.favorite !== null && open.favorite !== which && open.total !== null;
  const openText = spreadRow ? signed(open!.spread!) : totalRow ? String(open!.total) : "";
  const moved = spreadRow ? spreadMove(lines!, which) : totalRow ? totalMove(lines!) : null;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={side.logo} alt="" className="size-8 shrink-0 object-contain sm:size-10" loading="lazy" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight sm:text-lg">
            {side.rank !== null && <span className="mr-1 text-xs font-semibold text-zinc-400">{side.rank}</span>}
            {side.abbr}
          </p>
          {side.record && <p className="text-xs leading-tight text-zinc-400">{side.record}</p>}
        </div>
      </div>
      {state === "pre" ? (
        <>
          {/* The opening line is the first thing to go when the row is too tight. */}
          <div className="hidden w-10 shrink-0 flex-col items-center gap-0.5 text-center min-[400px]:flex sm:w-12">
            <p className="text-sm leading-tight text-zinc-400">{openText}</p>
            {moved !== null && <p className="text-[10px] font-semibold leading-none tabular-nums text-blue-400">{formatMove(moved)}</p>}
          </div>
          {lines && (
            <div className="flex gap-1 sm:gap-1.5">
              <Spread game={game} slate={slate} which={which} />
              <Total game={game} slate={slate} which={which} />
              <Moneyline game={game} slate={slate} which={which} />
            </div>
          )}
        </>
      ) : (
        <p className="shrink-0 pr-2 text-2xl font-bold tabular-nums">{side.score ?? "-"}</p>
      )}
    </div>
  );
}

function Card({ game, propsId, slate }: { game: GameCard; propsId?: string; slate: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <TeamRow side={game.away} game={game} which="away" slate={slate} />
      <TeamRow side={game.home} game={game} which="home" slate={slate} />
      <div className="flex items-center justify-between gap-3">
        {game.state === "pre" ? (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-zinc-400">
            <span className="shrink-0">{kickoffShort(game.kickoff)}</span>
            {game.venue.city && <span className="truncate">· {game.venue.city}</span>}
            <ForecastIcon venue={game.venue} forecast={game.forecast} />
          </p>
        ) : (
          <p className="text-sm text-zinc-400">
            {game.state === "in" ? <span className="font-semibold text-emerald-400">{game.detail}</span> : game.detail}
          </p>
        )}
        {propsId && (
          <Link
            href={`/games?tab=props&view=games&game=${propsId}`}
            className="rounded-full border border-zinc-600 px-3.5 py-1 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            Props
          </Link>
        )}
      </div>
    </article>
  );
}

function Section({ title, games, open, propsIds, slate, controls }: { title: string; games: GameCard[]; open: boolean; propsIds: Map<string, string>; slate: string; controls?: React.ReactNode }) {
  if (games.length === 0) return null;
  return (
    <details open={open} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {/* Links inside a summary don't toggle the section. */}
        <div className="ml-auto flex items-center gap-1.5">{controls}</div>
        <ChevronDown className="size-5 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3">
        {games.map((g) => (
          <Card key={g.id} game={g} propsId={g.state === "pre" ? propsIds.get(g.id) : undefined} slate={slate} />
        ))}
      </div>
    </details>
  );
}

const TABS = [
  { key: "nfl", label: "NFL", href: "/games" },
  { key: "ncaa", label: "NCAA", href: "/games?sport=ncaa" },
];

const FILTERS: { key: CollegeFilter; label: string }[] = [
  { key: "top25", label: "Top 25" },
  ...CONFERENCES.map((c) => ({ key: c.key, label: c.label })),
];

export default async function Games(props: PageProps<"/games">) {
  await connection();
  const { sport, conf, tab, view, player, prop, cat, game: gameParam, sort: sortParam } = await props.searchParams;
  const ncaa = sport === "ncaa";
  const onProps = !ncaa && tab === "props";
  const propsView = view === "games" ? "games" : "players";
  const filter: CollegeFilter = isCollegeFilter(conf) ? conf : "top25";

  let data: Slate | null = null;
  let propsData: UpcomingProps | null = null;
  let error: string | null = null;
  try {
    if (onProps) propsData = await getUpcomingProps();
    else {
      const slate = ncaa ? await getCollegeSlate(filter) : await getNflSlate();
      // The opening line is the one we saved at the start of the week. ESPN's own can be from the preseason.
      const opens = await getLineOpens(ncaa ? "ncaa" : "nfl").catch(() => null);
      data = { ...slate, games: slate.games.map((g) => applyOpens(g, opens)) };
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't load the games.";
  }

  // The Games list shows each team's logo and record, which only ESPN's scoreboard has.
  const teams: TeamInfo = new Map();
  const venues: VenueInfo = new Map();
  if (onProps && propsView === "games") {
    try {
      for (const g of (await getNflSlate()).games) {
        for (const side of [g.away, g.home]) teams.set(side.name, { logo: side.logo, record: side.record, abbr: side.abbr });
        venues.set(`${g.away.name}|${g.home.name}`, { venue: g.venue, forecast: g.forecast });
      }
    } catch {
      // Cards show names and times without them.
    }
  }

  // ESPN's game ids and the odds provider's differ, so each card finds its props by team names.
  const propsIds = new Map<string, string>();
  if (!ncaa && !onProps) {
    try {
      const snapshot = await getUpcomingProps();
      for (const g of data?.games ?? []) {
        const match = snapshot && findGameProps(snapshot.games, g.away.name, g.home.name);
        if (match) propsIds.set(g.id, match.eventId);
      }
    } catch {
      // No Props buttons, and the lines still show.
    }
  }

  // Which ESPN slate a pick came from, so the server can find the game again.
  const slate = ncaa ? filter : "nfl";
  const sort = isMoveKind(sortParam) ? sortParam : null;
  // Tapping the selected button clears it, so only one is on at a time or neither.
  const sortHref = (kind: MoveKind) => {
    const q = new URLSearchParams();
    if (ncaa) q.set("sport", "ncaa");
    if (ncaa && filter !== "top25") q.set("conf", filter);
    if (sort !== kind) q.set("sort", kind);
    return q.size > 0 ? `/games?${q}` : "/games";
  };
  const sortControls = (
    <>
      <span className="text-xs font-semibold text-zinc-400">Sort by Movement:</span>
      {(["spread", "total"] as const).map((kind) => (
        <Link
          key={kind}
          href={sortHref(kind)}
          replace
          scroll={false}
          aria-current={sort === kind ? "true" : undefined}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            sort === kind ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {kind === "spread" ? "Spread" : "Total"}
        </Link>
      ))}
    </>
  );
  const games = data?.games ?? [];
  const live = games.filter((g) => g.state === "in");
  const upcoming = games.filter((g) => g.state === "pre");
  const final = games.filter((g) => g.state === "post");
  // Game Lines for both leagues. Props are NFL only.
  const markets = [
    { label: "Game Lines", href: "/games", active: !onProps },
    ...(ncaa ? [] : [{ label: "Props", href: "/games?tab=props", active: onProps }]),
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      {/* Live scores, and other players' picks dimming the lines they've taken. */}
      <AutoRefresh />

      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">This Week&apos;s Lines</h1>
        <BoardAction />
      </header>

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

      <div className="-mx-4 flex gap-6 overflow-x-auto border-b border-zinc-800 px-4">
        {markets.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            replace
            scroll={false}
            aria-current={m.active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap border-b-4 pb-3 text-lg font-semibold ${
              m.active ? "border-emerald-500 text-zinc-50" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {m.label}
          </Link>
        ))}
      </div>

      {ncaa && (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4" aria-label="Conference">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "top25" ? "/games?sport=ncaa" : `/games?sport=ncaa&conf=${f.key}`}
              replace
              scroll={false}
              aria-current={filter === f.key ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold ${
                filter === f.key
                  ? "border-zinc-300 bg-zinc-800 text-zinc-50"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      )}

      {onProps && !error && (
        <>
          <nav className="flex gap-1 rounded-xl bg-zinc-900 p-1" aria-label="Props view">
            {(["players", "games"] as const).map((v) => (
              <Link
                key={v}
                href={`/games?tab=props&view=${v}`}
                replace
                aria-current={propsView === v ? "page" : undefined}
                className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold ${
                  propsView === v ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v === "players" ? "Players" : "Games"}
              </Link>
            ))}
          </nav>
          {propsView === "players" ? (
            <PlayersView props={propsData} player={typeof player === "string" ? player : null} prop={isPropTab(prop) ? prop : "tds"} />
          ) : (
            <GamesView
              props={propsData}
              gameId={typeof gameParam === "string" ? gameParam : null}
              category={isPropTab(cat) ? cat : null}
              teams={teams}
              venues={venues}
            />
          )}
        </>
      )}
      {error && <p className="card text-sm text-amber-300">Games are unavailable right now ({error}).</p>}
      {data && games.length === 0 && (
        <p className="card text-sm text-zinc-400">{ncaa && filter === "top25" ? "No ranked teams play this week." : "No games this week."}</p>
      )}

      <Section title="Live" slate={slate} games={live} open propsIds={propsIds} />
      <Section title="Upcoming" slate={slate} controls={sortControls} games={sort ? sortByMovement(upcoming, sort) : upcoming} open propsIds={propsIds} />
      <Section title="Final" slate={slate} games={final} open={live.length === 0 && upcoming.length === 0} propsIds={propsIds} />
      {games.some((g) => g.lines) && (
        <p className="text-center text-xs text-zinc-500">Lines from DraftKings via ESPN. FanDuel&apos;s can differ.</p>
      )}
    </main>
  );
}
