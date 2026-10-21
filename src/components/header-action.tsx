import Link from "next/link";
import { LIVE_PATH } from "@/lib/live/board";
import { getRoster } from "@/lib/live/players";
import { formatPrice } from "@/lib/rules";
import { currentWeek, getPicks, getSlipView } from "@/lib/slip/store";
import { PicksDialog, type PickRow } from "./picks-dialog";

// The top-right button on a page. While picks are open it's about the signed-in player's pick; once the
// slip is final it's the live board.
export async function PickAction() {
  const view = await getSlipView().catch(() => null);
  if (!view?.me || !view.open) {
    return (
      <Link href={LIVE_PATH} className="btn shrink-0">
        Live Board
      </Link>
    );
  }
  return (
    <Link href="/games" className="btn shrink-0">
      {view.mine ? "Edit Pick" : "Make Pick"}
    </Link>
  );
}

// The Lines tab's top-right button: while picks are open, a count of who has picked that opens the list of
// picks; once the slip is final, the live board.
export async function BoardAction() {
  const view = await getSlipView().catch(() => null);
  if (!view?.me || !view.open) {
    return (
      <Link href={LIVE_PATH} className="btn shrink-0">
        Live Board
      </Link>
    );
  }

  const [picks, roster] = await Promise.all([currentWeek().then(getPicks), getRoster()]);
  const rows: PickRow[] = roster.flatMap((p) => {
    const leg = picks.find((x) => x.slug === p.slug)?.leg;
    return leg
      ? [
          {
            slug: p.slug,
            name: p.name,
            photoUrl: p.photoUrl,
            label: leg.label,
            detail: leg.matchup ?? leg.market,
            price: leg.price === undefined ? undefined : formatPrice(leg.price),
          },
        ]
      : [];
  });
  return <PicksDialog rows={rows} total={roster.length} />;
}
