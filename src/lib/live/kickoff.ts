const COUNTDOWN_WINDOW_MS = 5 * 60 * 1000;
// If a game still shows no score this long after kickoff, stop saying "Kickoff".
const KICKOFF_GRACE_MS = 10 * 60 * 1000;

export interface KickoffInput {
  now: number;
  kickoff: number;
  // "Sun, Oct 4, 12:00 PM CT"
  scheduled: string;
  // "Q2 · 4:06", "Halftime". Set while the game is on.
  live?: string;
  final: boolean;
}

// What sits beside a leg's matchup: the kickoff time, then a countdown for the last five
// minutes, then the game clock, then "Final".
export function kickoffLabel({ now, kickoff, scheduled, live, final }: KickoffInput): string {
  if (final) return "Final";
  if (live) return live;

  const until = kickoff - now;
  if (until > COUNTDOWN_WINDOW_MS) return scheduled;
  if (until > 0) {
    const seconds = Math.ceil(until / 1000);
    return `Kickoff in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  return until > -KICKOFF_GRACE_MS ? "Kickoff" : scheduled;
}
