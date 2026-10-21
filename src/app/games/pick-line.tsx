import { conflictKeyOf, lineIdOf, type PickSpec } from "@/lib/slip/legs";
import { getSlipView } from "@/lib/slip/store";
import { PickButton, type PickState } from "./pick-button";
import { Line } from "./shared";

const DEFAULT_WIDTH = "w-[3.6rem] shrink-0 sm:w-[4.1rem]";

// A price box the signed-in player can tap to pick. Shows whether it's their pick, taken by someone
// else (or the other side of theirs), or closed because the slip is final.
export async function PickLine({
  spec,
  top,
  bottom,
  className = DEFAULT_WIDTH,
}: {
  spec: PickSpec;
  top: string;
  bottom: string;
  className?: string;
}) {
  const view = await getSlipView();
  if (!view.me) return <Line top={top} bottom={bottom} className={className} />;

  const conflict = conflictKeyOf(spec);
  const takenBy = view.taken.get(conflict);
  // A player's own pick lights up on the exact line; the other side of it just stays tappable.
  const mine = view.mine?.conflictKey === conflict && view.mine.lineId === lineIdOf(spec);
  const state: PickState = mine ? "mine" : !view.open ? "locked" : takenBy ? "taken" : "open";

  const fields: Record<string, string> =
    spec.src === "game"
      ? { src: "game", slate: spec.slate, gameId: spec.gameId, kind: spec.kind, side: spec.side, away: spec.away, home: spec.home }
      : {
          src: "prop",
          eventId: spec.eventId,
          tab: spec.tab,
          player: spec.player,
          point: spec.point === null ? "" : String(spec.point),
          side: spec.side,
          away: spec.away,
          home: spec.home,
        };

  const title =
    state === "taken" ? `${takenBy} has this bet, or the other side of it` : state === "mine" ? "Your pick. Tap to take it back" : undefined;

  return (
    <PickButton fields={fields} state={state} title={title} className={className}>
      <Line top={top} bottom={bottom} className="w-full" />
    </PickButton>
  );
}
