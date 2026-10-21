import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { PickAction } from "@/components/header-action";
import { type ArchivedLeg } from "@/lib/live/board";
import { getRole } from "@/lib/live/activity-store";
import { getBadges, getPlayerProfile, getRoster, getAvatarMarks, marksOf } from "@/lib/live/players";
import { formatRecord, hitRate, playerBySlug } from "@/lib/players";
import { formatPrice } from "@/lib/rules";
import { getPicks, isDrafting } from "@/lib/slip/store";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { BADGE_EMOJI } from "@/lib/stats";
import { EditPick } from "./edit-pick";

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
  const [profile, roster, badges, marks] = await Promise.all([getPlayerProfile(slug), getRoster(), getBadges(), getAvatarMarks()]);
  const emoji = (s: string) => (badges.has(s) ? BADGE_EMOJI[badges.get(s)!] : undefined);
  if (!profile) notFound();
  const others = roster.filter((p) => p.slug !== slug.toLowerCase());

  // While picks are open this week's pick is still a draft, not yet on the live board.
  const drafting = await isDrafting(profile.current.weekNumber);
  const draft = drafting ? (await getPicks(profile.current.weekNumber)).find((p) => p.slug === slug.toLowerCase())?.leg : undefined;

  const { record } = profile;
  const rate = hitRate(record);
  // "My Picks" on your own page. On someone else's it's theirs.
  const me = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const isOwn = me === slug.toLowerCase();
  // Only the super admin gets the Activity link, and only on their own page.
  const showActivity = isOwn && (await getRole(me)) === "super_admin";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">{isOwn ? "My Picks" : `${profile.name}'s Picks`}</h1>
        {drafting && isOwn ? (
          draft ? (
            <EditPick
              label={draft.label}
              detail={draft.matchup ?? draft.market}
              price={draft.price === undefined ? undefined : formatPrice(draft.price)}
              trigger="Edit Pick"
              className="btn shrink-0"
            />
          ) : (
            <Link href="/games" className="btn shrink-0">
              Make Pick
            </Link>
          )
        ) : (
          <PickAction />
        )}
      </header>

      <section className="flex items-center gap-3">
        <Avatar name={profile.name} photoUrl={profile.photoUrl} className="size-16 text-2xl" badge={emoji(slug.toLowerCase())} {...marksOf(marks, slug.toLowerCase())} badgeClass="text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold tracking-tight">{profile.name}</h2>
          {profile.fantasyName && <p className="truncate text-sm text-zinc-400">{profile.fantasyName}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold leading-tight tracking-tight">{formatRecord(record)}</p>
          {rate !== null && <p className="text-xs text-zinc-400">{Math.round(rate * 100)}% hit rate</p>}
        </div>
      </section>

      {showActivity && (
        <Link href="/activity" className="-mt-2 self-end text-xs text-blue-400 hover:underline">
          Activity
        </Link>
      )}

      {(drafting || profile.current.legs.length > 0) && (
        <section className="card flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">
              Week {profile.current.weekNumber} <span className="font-normal text-zinc-400">· this week</span>
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              {profile.current.role && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE[profile.current.role].className}`}>
                  {ROLE[profile.current.role].text}
                </span>
              )}
              {drafting &&
                isOwn &&
                (draft ? (
                  <EditPick
                    label={draft.label}
                    detail={draft.matchup ?? draft.market}
                    price={draft.price === undefined ? undefined : formatPrice(draft.price)}
                  />
                ) : (
                  <Link href="/games" className="btn !py-1.5">
                    Pick
                  </Link>
                ))}
            </div>
          </div>
          {drafting &&
            (draft ? (
              <ul>
                <li className="flex items-baseline justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{draft.label}</p>
                    <p className="truncate text-xs text-zinc-400">{draft.matchup ?? draft.market}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-zinc-300">Not final</p>
                    {draft.price !== undefined && <p className="text-xs text-zinc-400">{formatPrice(draft.price)}</p>}
                  </div>
                </li>
              </ul>
            ) : (
              <p className="py-2 text-sm text-zinc-500">No pick yet</p>
            ))}
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

      {/* Always pinned to the top of the app bar. The top padding on the row leaves room for a streak badge. */}
      <nav
        aria-label="Pick history"
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"
      >
        <div className="mx-auto max-w-2xl px-4 pb-1 pt-2">
          <h2 className="label !mb-0">Pick History</h2>
          {/* Swipes sideways and snaps to each photo. */}
          <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 pt-3">
            {others.map((p) => (
              <li key={p.slug} className="shrink-0 snap-start">
                <Link href={`/${p.slug}`} className="flex w-20 flex-col items-center gap-1.5 hover:opacity-80">
                  <Avatar name={p.name} photoUrl={p.photoUrl} className="size-14 text-xl" badge={emoji(p.slug)} {...marksOf(marks, p.slug)} badgeClass="text-lg" />
                  <span className="w-full truncate text-center text-xs font-semibold text-zinc-300">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </main>
  );
}
