import { sameOwner } from "./players";

interface Owned {
  owner: string;
  label: string;
  market?: string;
  price?: number;
}

// Players with no leg in the week: the clowns.
export function nonPickers<P extends { name: string }>(legs: { owner: string }[], players: P[]): P[] {
  return players.filter((p) => !legs.some((l) => sameOwner(l.owner, p.name)));
}

// A player's picks that week, as the label and odds. Usually one. A prop's label is just the player ("Kenneth Walker
// III"), so its stat goes with it.
export function picksOf(legs: Owned[], name: string): { label: string; price?: number }[] {
  return legs
    .filter((l) => sameOwner(l.owner, name))
    .map((l) => ({ label: l.market ? `${l.label} · ${l.market}` : l.label, price: l.price }));
}
