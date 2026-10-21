import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { PickAction } from "@/components/header-action";
import { getPastWeeks } from "@/lib/live/board";
import { getAvatarMarks, getPickAwards, getRoster, marksOf, type Marks, type RosterEntry } from "@/lib/live/players";
import { formatRecord } from "@/lib/players";
import { formatPrice } from "@/lib/rules";
import { nonPickers, picksOf } from "@/lib/summary";
import { badges as streakBadges, BADGE_EMOJI, extremes, standings, type Badge, type Standing } from "@/lib/stats";

const percent = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 100)}%`);

export const metadata: Metadata = { title: "Low-T Parlay", robots: { index: false, follow: false } };

const badgeOf = (badges: Map<string, Badge>, slug: string) => {
  const badge = badges.get(slug);
  return badge ? BADGE_EMOJI[badge] : undefined;
};

function PickerCard({
  title,
  tone,
  rows,
  photos,
  badges,
  marks,
}: {
  title: string;
  tone: string;
  rows: Standing[];
  photos: Map<string, string | null>;
  badges: Map<string, Badge>;
  marks: Map<string, Marks>;
}) {
  return (
    <section className="card flex flex-col gap-2">
      <h2 className={`label !mb-0 ${tone}`}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Nobody yet.</p>
      ) : (
        rows.map((r) => (
          <Link key={r.slug} href={`/${r.slug}`} className="flex items-center gap-3 hover:opacity-80">
            <Avatar
              name={r.name}
              photoUrl={photos.get(r.slug) ?? null}
              className="size-12 text-lg"
              badge={badgeOf(badges, r.slug)}
              {...marksOf(marks, r.slug)}
            />
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

// Who missed last week's slip. Only shown when somebody did.
function ClownsCard({ people, marks }: { people: RosterEntry[]; marks: Map<string, Marks> }) {
  return (
    <section className="card flex flex-col gap-2">
      <h2 className="label !mb-0 !text-red-400">🤡 Clowns of the Week</h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
        {people.map((p) => (
          <li key={p.slug}>
            <Link href={`/${p.slug}`} className="flex items-center gap-3 hover:opacity-80">
              <Avatar name={p.name} photoUrl={p.photoUrl} className="size-12 text-lg" {...marksOf(marks, p.slug)} />
              <div className="min-w-0">
                <p className="truncate font-bold">{p.name}</p>
                <p className="text-xs text-zinc-400">No pick</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The best or worst pick of last week: the player, and under their name what they picked and at what odds.
function AwardCard({
  title,
  tone,
  people,
  legs,
  marks,
}: {
  title: string;
  tone: string;
  people: RosterEntry[];
  legs: { owner: string; label: string; market?: string; price?: number }[];
  marks: Map<string, Marks>;
}) {
  return (
    <section className="card flex flex-col gap-2">
      <h2 className={`label !mb-0 ${tone}`}>{title}</h2>
      {people.length === 0 ? (
        <p className="text-sm text-zinc-400">Nobody.</p>
      ) : (
        people.map((p) => (
          <Link key={p.slug} href={`/${p.slug}`} className="flex items-center gap-3 hover:opacity-80">
            <Avatar name={p.name} photoUrl={p.photoUrl} className="size-12 text-lg" {...marksOf(marks, p.slug)} />
            <div className="min-w-0">
              <p className="truncate font-bold">{p.name}</p>
              {picksOf(legs, p.name).map((pick, i) => (
                <p key={i} className="text-xs leading-snug text-zinc-400">
                  {pick.label}
                  {pick.price !== undefined && <span className="ml-1 font-semibold text-zinc-300">{formatPrice(pick.price)}</span>}
                </p>
              ))}
            </div>
          </Link>
        ))
      )}
    </section>
  );
}

export default async function Home() {
  await connection();
  const [weeks, roster, marks, awards] = await Promise.all([getPastWeeks(), getRoster(), getAvatarMarks(), getPickAwards()]);
  const photos = new Map(roster.map((p) => [p.slug, p.photoUrl]));

  const results = weeks.map((w) => ({ weekNumber: w.weekNumber, legs: w.legs }));
  const rows = standings(results);
  const { best, worst } = extremes(rows);
  const badges = streakBadges(results);

  // Last week is the latest archived week. Past weeks come newest first.
  const last = weeks[0];
  const clowns = last ? nonPickers(last.legs, roster) : [];
  const bySlug = (slugs: string[]) => roster.filter((p) => slugs.includes(p.slug));
  const awardLegs = awards ? (weeks.find((w) => w.weekNumber === awards.weekNumber)?.legs ?? []) : [];
  const hasAwards = !!awards && (awards.best.length > 0 || awards.worst.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Low-T <span className="text-emerald-400">Parlay</span>
          </h1>
          <p className="text-sm text-zinc-500">
            {weeks.length} week{weeks.length === 1 ? "" : "s"} played
          </p>
        </div>
        <PickAction />
      </header>

      {last && (clowns.length > 0 || hasAwards) && (
        <>
          <h2 className="text-lg font-bold tracking-tight">
            Last Week&apos;s Summary <span className="text-sm font-normal text-zinc-500">Week {last.weekNumber}</span>
          </h2>
          {clowns.length > 0 && <ClownsCard people={clowns} marks={marks} />}
          {hasAwards && (
            <div className="grid grid-cols-2 gap-3">
              <AwardCard title="🎯 Bullseyes" tone="!text-emerald-400" people={bySlug(awards.best)} legs={awardLegs} marks={marks} />
              <AwardCard title="🤮 Pukey Picks" tone="!text-red-400" people={bySlug(awards.worst)} legs={awardLegs} marks={marks} />
            </div>
          )}
        </>
      )}

      <h2 className="text-lg font-bold tracking-tight">Pick Performance</h2>
      <div className="grid grid-cols-2 gap-3">
        <PickerCard title="🦈 Sharks" tone="!text-emerald-400" rows={best} photos={photos} badges={badges} marks={marks} />
        <PickerCard title="💩 Shitters" tone="!text-red-400" rows={worst} photos={photos} badges={badges} marks={marks} />
      </div>

      <section className="card">
        <h2 className="label">Leaderboard</h2>
        <ol>
          {rows.map((r, i) => (
            <li key={r.slug}>
              <Link href={`/${r.slug}`} className="flex items-center gap-3 border-b border-zinc-800 py-2 last:border-b-0 hover:opacity-80">
                <span className="w-5 text-center text-sm font-semibold text-zinc-500">{i + 1}</span>
                <Avatar
                  name={r.name}
                  photoUrl={photos.get(r.slug) ?? null}
                  className="size-9 text-sm"
                  badge={badgeOf(badges, r.slug)}
                  {...marksOf(marks, r.slug)}
                />
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
