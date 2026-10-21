"use client";

import { finalizeBetSlip } from "./actions";

// Finalizing can't be undone from the page, so it asks first.
export function FinalizeButton({ missing }: { missing: number }) {
  return (
    <form
      action={finalizeBetSlip}
      onSubmit={(e) => {
        const note = missing > 0 ? `${missing} player${missing === 1 ? " hasn't" : "s haven't"} picked yet. ` : "";
        if (!confirm(`${note}Finalize the slip and put it on the live board? Nobody can change their pick after this.`)) e.preventDefault();
      }}
    >
      <button type="submit" className="btn w-full">
        Finalize slip
      </button>
    </form>
  );
}
