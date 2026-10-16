import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LIVE_PATH, type ArchivedLeg } from "@/lib/live/board";
import { getPlayerProfile } from "@/lib/live/players";
import { formatRecord, hitRate, playerBySlug } from "@/lib/players";
import { formatPrice } from "@/lib/rules";

const RESULT = {
  hit: { text: "Hit", className: "text-emerald-400" },
  miss: { text: "Missed", className: "text-red-400" },
  push: { text: "Push", className: "text-zinc-300" },
};

const ROLE = {
  high: { text: "High scorer", className: "bg-emerald-950/60 text-emerald-300" },
  low: { text: "Low scorer", className: "bg-red-950/60 text-red-300" },
};

export async function generateMetadata(props: PageProps<"/[player]">): Promise<Metadata> {
  const player = playerBySlug((await props.params).player);
  return { title: player ? `${player.name} | Low-T Parlay` : "Low-T Parlay", robots: { index: false, follow: false } };
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt="" className="size-20 shrink-0 rounded-full object-cover ring-2 ring-zinc-700" />
  ) : (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-300 ring-2 ring-zinc-700">
      {name[0]}
    </div>
  );
}

function LegLine({ leg }: { leg: ArchivedLeg }) {
  const result = RESULT[leg.result];
  return (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-semibold">{leg.label}</p>
        <p className="truncate text-xs text-zinc-400">{leg.matchup ?? leg.market}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold ${result.className}`}>{result.text}</p>
        {leg.price !== undefined && <p className="text-xs text-zinc-400">{formatPrice(leg.price)}</p>}
      </div>
    </li>
  );
}

export default async function PlayerPage(props: PageProps<"/[player]">) {
  await connection();
  const { player: slug } = await props.params;
  const profile = await getPlayerProfile(slug);
  if (!profile) notFound();

  const { record } = profile;
  const rate = hitRate(record);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <Link href={LIVE_PATH} className="text-sm text-blue-400 hover:underline">
        Live board
      </Link>

      <header className="flex items-center gap-4">
        <Avatar name={profile.name} photoUrl={profile.photoUrl} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
          {profile.fantasyName && <p className="truncate text-sm text-zinc-400">{profile.fantasyName}</p>}
        </div>
      </header>

      <section className="card flex items-baseline justify-between gap-3">
        <div>
          <p className="label">Record (W-L-P)</p>
          <p className="text-3xl font-bold tracking-tight">{formatRecord(record)}</p>
        </div>
        {rate !== null && (
          <p className="text-right text-sm text-zinc-400">
            <span className="text-xl font-bold text-zinc-100">{Math.round(rate * 100)}%</span> hit rate
          </p>
        )}
      </section>

      {profile.current.legs.length > 0 && (
        <section className="card flex flex-col">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold">
              Week {profile.current.weekNumber} <span className="font-normal text-zinc-400">· this week</span>
            </h2>
            {profile.current.role && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE[profile.current.role].className}`}>
                {ROLE[profile.current.role].text}
              </span>
            )}
          </div>
          <ul>
            {profile.current.legs.map(({ leg, grade }) => (
              <li key={leg.id} className="flex items-baseline justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{leg.label}</p>
                  <p className="truncate text-xs text-zinc-400">{leg.matchup ?? leg.market}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-zinc-300">{grade.label ?? grade.state}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.weeks.length === 0 && <p className="card text-sm text-zinc-400">No finished weeks yet.</p>}

      {profile.weeks.map((week) => (
        <section key={week.weekNumber} className="card flex flex-col">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold">Week {week.weekNumber}</h2>
            {week.role && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE[week.role].className}`}>
                {ROLE[week.role].text}
              </span>
            )}
          </div>
          <ul>
            {week.legs.map((leg) => (
              <LegLine key={leg.id} leg={leg} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
