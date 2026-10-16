import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { nickname } from "@/lib/live/teams";
import {
  PROP_TABS,
  playerIndex,
  shortName,
  topProps,
  type GameProps,
  type PlayerProp,
  type PropTab,
} from "@/lib/odds/props";
import type { UpcomingProps } from "@/lib/odds/props-store";
import { formatPrice } from "@/lib/rules";
import { PlayerSearch } from "./player-search";
import { PropSelect } from "./prop-select";
import type { Forecast, Venue } from "@/lib/games/espn-games";
import { ForecastIcon } from "./forecast-icon";
import { kickoffLabel, kickoffLong, kickoffParts, Line } from "./shared";

const TABS = Object.keys(PROP_TABS) as PropTab[];

const matchup = (g: GameProps) => `${nickname(g.awayTeam)} @ ${nickname(g.homeTeam)}`;

// The price boxes for one player: over and under on a line, or the anytime TD price.
function Boxes({ tab, prop, className }: { tab: PropTab; prop: PlayerProp; className?: string }) {
  if (!PROP_TABS[tab].yards) {
    return <Line top={prop.yes === null ? "-" : formatPrice(prop.yes)} bottom="Anytime" className={className} />;
  }
  const point = prop.point === null ? "-" : null;
  return (
    <>
      <Line top={point ?? `o${prop.point}`} bottom={prop.over === null ? "" : formatPrice(prop.over)} className={className} />
      <Line top={point ?? `u${prop.point}`} bottom={prop.under === null ? "" : formatPrice(prop.under)} className={className} />
    </>
  );
}

function Row({
  name,
  sub,
  tab,
  prop,
  photo,
  avatar = true,
}: {
  name: string;
  sub?: string;
  tab: PropTab;
  prop: PlayerProp;
  photo?: string;
  // Off for a row that's a stat line, not a player.
  avatar?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-zinc-800 py-2 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        {avatar && <Avatar name={name} photoUrl={photo ?? null} className="size-10 text-base" />}
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          {sub && <p className="truncate text-xs text-zinc-400">{sub}</p>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Boxes tab={tab} prop={prop} />
      </div>
    </li>
  );
}

function Unavailable() {
  return (
    <p className="card text-sm text-zinc-400">
      Props haven&apos;t been pulled yet. They&apos;re pulled at noon Central on Tuesday, Wednesday and Thursday.
    </p>
  );
}

function Footer({ fetchedAt }: { fetchedAt: string }) {
  return (
    <p className="text-center text-xs text-zinc-500">
      FanDuel props, pulled {kickoffLabel(fetchedAt)} CT. Refreshed Tue, Wed and Thu at noon.
    </p>
  );
}

// Everything one player has up this week.
function PlayerCard({ entry, photo }: { entry: ReturnType<typeof playerIndex>[number]; photo?: string }) {
  return (
    <section className="card flex flex-col">
      <div className="flex items-center gap-3">
        <Avatar name={entry.name} photoUrl={photo ?? null} className="size-16 text-2xl" />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{entry.name}</h2>
          <p className="text-sm text-zinc-400">
            {matchup(entry.game)} · {kickoffLabel(entry.game.commenceTime)}
          </p>
        </div>
      </div>
      <ul className="mt-2">
        {TABS.filter((t) => entry.props[t]).map((t) => (
          <Row key={t} name={PROP_TABS[t].label} tab={t} prop={entry.props[t]!} avatar={false} />
        ))}
      </ul>
    </section>
  );
}

// Players: a prop type dropdown with the search box beside it. The chosen type lists its top 10, and
// picking a player swaps the list for their card.
export function PlayersView({ props, player, prop }: { props: UpcomingProps | null; player: string | null; prop: PropTab }) {
  if (!props) return <Unavailable />;
  const index = playerIndex(props.games);
  const selected = player ? index.find((p) => p.name === player) : undefined;
  const top = topProps(props.games, prop);

  return (
    <>
      <div className="flex items-center gap-3">
        <PropSelect prop={prop} playerOpen={!!selected} />
        <PlayerSearch names={index.map((p) => p.name)} selected={selected?.name ?? null} prop={prop} />
      </div>

      {selected ? (
        <PlayerCard entry={selected} photo={props.photos[selected.name]} />
      ) : top.length === 0 ? (
        <p className="card text-sm text-zinc-400">No {PROP_TABS[prop].label.toLowerCase()} props are up for the games left this week.</p>
      ) : (
        <section className="card flex flex-col">
          <h2 className="font-bold">
            Top {top.length} · {PROP_TABS[prop].label}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {PROP_TABS[prop].yards ? "biggest lines" : "likeliest to score"}
            </span>
          </h2>
          <ul>
            {top.map(({ game, prop: p }) => (
              <Row key={`${game.eventId}|${p.player}`} name={p.player} sub={matchup(game)} tab={prop} prop={p} photo={props.photos[p.player]} />
            ))}
          </ul>
        </section>
      )}
      <Footer fetchedAt={props.fetchedAt} />
    </>
  );
}

// A game's prop types that have anything up, in the usual order.
const availableTabs = (game: GameProps) => TABS.filter((t) => (game.markets[PROP_TABS[t].market] ?? []).length > 0);

// One player in a narrow column: photo and short name, with the price boxes underneath.
function Cell({ prop, tab, photo }: { prop: PlayerProp; tab: PropTab; photo?: string }) {
  return (
    <li className="flex flex-col gap-1.5 border-b border-zinc-800 py-2 last:border-b-0">
      <div className="flex items-center gap-1.5">
        <Avatar name={prop.player} photoUrl={photo ?? null} className="size-7 text-xs" />
        <p className="min-w-0 truncate text-[13px] font-semibold">{shortName(prop.player)}</p>
      </div>
      <div className="flex gap-1">
        <Boxes tab={tab} prop={prop} className="min-w-0 flex-1" />
      </div>
    </li>
  );
}

// One prop type's players for a game, away team's on the left and home team's on the right to match the
// header, under a row of tabs for the types that have props.
function GameBlock({
  game,
  category,
  photos,
  sides,
}: {
  game: GameProps;
  category: PropTab | null;
  photos: Record<string, string>;
  sides: Record<string, "away" | "home">;
}) {
  const tabs = availableTabs(game);
  const active = category && tabs.includes(category) ? category : tabs[0];
  if (!active) return <p className="border-t border-zinc-800 p-4 text-sm text-zinc-400">No props are up for this game yet.</p>;

  const rows = [...(game.markets[PROP_TABS[active].market] ?? [])];
  rows.sort(PROP_TABS[active].yards ? (a, b) => (b.point ?? 0) - (a.point ?? 0) : (a, b) => (a.yes ?? 0) - (b.yes ?? 0));
  const href = (t: PropTab) => `/games?tab=props&view=games&game=${game.eventId}&cat=${t}`;
  const away = rows.filter((r) => sides[r.player] === "away");
  const home = rows.filter((r) => sides[r.player] === "home");
  // Anyone ESPN's rosters couldn't place on a team goes underneath, so nobody is dropped.
  const other = rows.filter((r) => !sides[r.player]);

  const column = (list: PlayerProp[], team: string) => (
    <div className="min-w-0">
      <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{nickname(team)}</p>
      <ul>
        {list.map((prop) => (
          <Cell key={`${prop.player}|${prop.point}`} prop={prop} tab={active} photo={photos[prop.player]} />
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <nav className="flex gap-6 overflow-x-auto border-t border-zinc-800 px-4" aria-label="Prop type">
        {tabs.map((t) => (
          <Link
            key={t}
            href={href(t)}
            replace
            scroll={false}
            aria-current={t === active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap border-b-4 py-3 text-base font-semibold ${
              t === active ? "border-emerald-500 text-zinc-50" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {PROP_TABS[t].label}
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-2 gap-x-4 border-t border-zinc-800 px-4 py-3">
        {column(away, game.awayTeam)}
        {column(home, game.homeTeam)}
      </div>
      {other.length > 0 && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Team unknown</p>
          <ul className="grid grid-cols-2 gap-x-4">
            {other.map((prop) => (
              <Cell key={`${prop.player}|${prop.point}`} prop={prop} tab={active} photo={photos[prop.player]} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// A team's logo and record, from ESPN's scoreboard, by team display name.
export type TeamInfo = Map<string, { logo: string; record: string | null; abbr: string }>;

function TeamLine({ name, info }: { name: string; info?: { logo: string; record: string | null } }) {
  const nick = nickname(name);
  // Long names step down so they fit between the logo and the date block.
  const size = nick.length >= 10 ? "text-[13px]" : nick.length >= 8 ? "text-[15px]" : "text-lg";
  return (
    <div className="flex items-center gap-2">
      {info?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={info.logo} alt="" className="size-8 shrink-0 object-contain sm:size-9" loading="lazy" />
      ) : (
        <span className="size-8 shrink-0 sm:size-9" aria-hidden />
      )}
      <div className="min-w-0">
        <p className={`truncate font-black uppercase italic leading-tight tracking-tight ${size}`}>{nick}</p>
        {info?.record && <p className="text-xs font-semibold leading-tight text-zinc-400">{info.record}</p>}
      </div>
    </div>
  );
}

// A card in the Games list: the teams with their records, then the day, time and where it's played with the
// forecast, then a "View Props" at the far right. The middle and right zones size to their text.
function GameHeader({ game, teams, venues }: { game: GameProps; teams: TeamInfo; venues: VenueInfo }) {
  const { day, time } = kickoffParts(game.commenceTime);
  const where = venues.get(`${game.awayTeam}|${game.homeTeam}`);
  return (
    <div className="flex items-stretch">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 py-3.5 pl-3.5 pr-2">
        <TeamLine name={game.awayTeam} info={teams.get(game.awayTeam)} />
        <TeamLine name={game.homeTeam} info={teams.get(game.homeTeam)} />
      </div>
      <div className="my-3 w-px shrink-0 bg-zinc-700" aria-hidden />
      <div className="flex w-[6.25rem] shrink-0 flex-col items-center min-[370px]:w-[7.25rem] justify-center gap-0.5 px-1.5 text-center text-sm font-bold leading-snug">
        <span>{day}</span>
        <span className="whitespace-nowrap">{time}</span>
        {where && (where.venue.city || where.venue.indoor || where.forecast) && (
          <span className="flex max-w-full items-center justify-center gap-1 text-[11px] font-normal text-zinc-400">
            {where.venue.city && <span className="truncate">{where.venue.city}</span>}
            <ForecastIcon venue={where.venue} forecast={where.forecast} className="size-3.5 shrink-0" />
          </span>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-0.5 pl-1 pr-2 text-xs font-semibold leading-tight text-emerald-400">
        <span className="text-center">
          View
          <br />
          Props
        </span>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
      </span>
    </div>
  );
}

// Where a game is played and the forecast for it, from ESPN's scoreboard, keyed "away name|home name".
export type VenueInfo = Map<string, { venue: Venue; forecast: Forecast | null }>;

function DetailHeader({ game, teams, venues }: { game: GameProps; teams: TeamInfo; venues: VenueInfo }) {
  const where = venues.get(`${game.awayTeam}|${game.homeTeam}`);
  const side = (name: string) => {
    const info = teams.get(name);
    return (
      <div className="flex w-20 shrink-0 flex-col items-center gap-2">
        {info?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.logo} alt="" className="size-14 object-contain" />
        ) : (
          <span className="size-14" aria-hidden />
        )}
        <span className="font-bold">{info?.abbr ?? nickname(name).slice(0, 3).toUpperCase()}</span>
      </div>
    );
  };
  return (
    <div className="flex items-start justify-between gap-2 px-4 py-4">
      {side(game.awayTeam)}
      <div className="mt-4 flex min-w-0 flex-col items-center gap-1 text-center text-zinc-400">
        <p>{kickoffLong(game.commenceTime)}</p>
        {where && (where.venue.city || where.venue.indoor || where.forecast) && (
          <p className="flex items-center gap-1.5 text-sm">
            {where.venue.city && <span className="truncate">{where.venue.city}</span>}
            <ForecastIcon venue={where.venue} forecast={where.forecast} />
          </p>
        )}
      </div>
      {side(game.homeTeam)}
    </div>
  );
}

// Games: a list of game cards. Tapping one opens that game's props, one prop type per tab, which is also where
// the Props button on a Game Lines card lands.
export function GamesView({
  props,
  gameId,
  category,
  teams,
  venues,
}: {
  props: UpcomingProps | null;
  gameId: string | null;
  category: PropTab | null;
  teams: TeamInfo;
  venues: VenueInfo;
}) {
  if (!props) return <Unavailable />;
  const one = gameId ? props.games.find((g) => g.eventId === gameId) : undefined;

  if (one) {
    return (
      <>
        <Link href="/games?tab=props&view=games" className="inline-flex items-center gap-0.5 self-start text-sm text-blue-400 hover:underline">
          <ChevronLeft className="size-4" aria-hidden />
          Games
        </Link>
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <DetailHeader game={one} teams={teams} venues={venues} />
          <GameBlock game={one} category={category} photos={props.photos} sides={props.sides} />
        </div>
        <Footer fetchedAt={props.fetchedAt} />
      </>
    );
  }

  // A game with no props posted yet would open to nothing.
  const listed = props.games.filter((g) => Object.values(g.markets).some((rows) => rows.length > 0));

  return (
    <>
      {listed.length === 0 && <p className="card text-sm text-zinc-400">No props are up for the games left this week.</p>}
      <ul className="flex flex-col gap-3">
        {listed.map((game) => (
          <li key={game.eventId}>
            <Link
              href={`/games?tab=props&view=games&game=${game.eventId}`}
              className="block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/60"
            >
              <GameHeader game={game} teams={teams} venues={venues} />
            </Link>
          </li>
        ))}
      </ul>
      <Footer fetchedAt={props.fetchedAt} />
    </>
  );
}
