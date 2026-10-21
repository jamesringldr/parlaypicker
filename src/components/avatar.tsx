export function Avatar({
  name,
  photoUrl,
  className = "size-20 text-3xl",
  badge,
  corner,
  award,
  badgeClass = "text-sm",
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
  // An emoji pinned to the top-right corner.
  badge?: string;
  // An emoji pinned to the top-left corner.
  corner?: string;
  // An emoji pinned to the bottom-right corner.
  award?: string;
  badgeClass?: string;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className={`${className} rounded-full object-cover object-top ring-2 ring-zinc-700`} />
      ) : (
        <span
          className={`${className} flex items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-300 ring-2 ring-zinc-700`}
        >
          {name[0]}
        </span>
      )}
      {corner && (
        <span className={`absolute -left-1.5 -top-1.5 leading-none drop-shadow ${badgeClass}`} aria-hidden>
          {corner}
        </span>
      )}
      {award && (
        <span className={`absolute -bottom-1.5 -right-1.5 leading-none drop-shadow ${badgeClass}`} aria-hidden>
          {award}
        </span>
      )}
      {badge && (
        <span className={`absolute -right-1.5 -top-1.5 leading-none drop-shadow ${badgeClass}`} aria-hidden>
          {badge}
        </span>
      )}
    </span>
  );
}
