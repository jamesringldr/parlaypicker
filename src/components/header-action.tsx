import Link from "next/link";
import { LIVE_PATH } from "@/lib/live/board";
import { getSlipView } from "@/lib/slip/store";

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

// The Board's top-right button: the Bet Slip while picks are open, the live board once it's final.
export async function BoardAction() {
  const view = await getSlipView().catch(() => null);
  const open = !!view?.me && view.open;
  return (
    <Link href={open ? "/bet-slip" : LIVE_PATH} className="btn shrink-0">
      {open ? "Bet Slip" : "Live Board"}
    </Link>
  );
}
