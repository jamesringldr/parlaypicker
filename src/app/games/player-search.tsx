"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { searchPlayers, type PropTab } from "@/lib/odds/props";

// A box that suggests players as you type. Picking one opens their props.
export function PlayerSearch({ names, selected, prop }: { names: string[]; selected: string | null; prop: PropTab }) {
  const router = useRouter();
  const HREF = `/games?tab=props&view=players&prop=${prop}`;
  const [query, setQuery] = useState(selected ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(() => searchPlayers(names, query), [names, query]);
  const showList = open && matches.length > 0 && query !== selected;

  function choose(name: string) {
    setQuery(name);
    setOpen(false);
    router.push(`${HREF}&player=${encodeURIComponent(name)}`, { scroll: false });
  }

  function clear() {
    setQuery("");
    setOpen(false);
    if (selected) router.push(HREF, { scroll: false });
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls="player-matches"
          aria-label="Search players"
          placeholder="Search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && matches[active]) {
              e.preventDefault();
              choose(matches[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="input !pl-9 !pr-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={clear} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-100">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id="player-matches"
          role="listbox"
          className="absolute right-0 z-10 mt-1 max-h-72 w-64 max-w-[85vw] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
        >
          {matches.map((name, i) => (
            <li key={name} role="option" aria-selected={i === active}>
              <button
                type="button"
                // onMouseDown so it lands before the input loses focus.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(name);
                }}
                className={`block w-full px-3 py-2 text-left text-sm font-semibold ${i === active ? "bg-zinc-800" : "hover:bg-zinc-800"}`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
