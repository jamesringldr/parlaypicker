// The twelve owners. A slug is the lowercased name, and also the profile page's URL.
export const PLAYERS = [
  "Joe",
  "Rockhold",
  "Sheil",
  "Andrew",
  "John",
  "Aaron",
  "Rodgers",
  "Hoover",
  "Lucas",
  "Rosey",
  "Dane",
  "Ja",
].map((name) => ({ name, slug: name.toLowerCase() }));

export function playerBySlug(slug: string) {
  return PLAYERS.find((p) => p.slug === slug.toLowerCase());
}

export function sameOwner(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export interface Tally {
  wins: number;
  losses: number;
  pushes: number;
}

// Pushes are their own column, not a win or a loss. Legs that haven't settled aren't counted.
export function tally(results: string[]): Tally {
  return {
    wins: results.filter((r) => r === "hit").length,
    losses: results.filter((r) => r === "miss").length,
    pushes: results.filter((r) => r === "push").length,
  };
}

export function formatRecord({ wins, losses, pushes }: Tally) {
  return `${wins}-${losses}-${pushes}`;
}

// Share of decided legs that hit. Null before any leg has decided.
export function hitRate({ wins, losses }: Tally): number | null {
  return wins + losses === 0 ? null : wins / (wins + losses);
}
