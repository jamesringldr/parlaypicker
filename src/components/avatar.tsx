export function Avatar({
  name,
  photoUrl,
  className = "size-20 text-3xl",
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt="" className={`${className} shrink-0 rounded-full object-cover ring-2 ring-zinc-700`} />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-300 ring-2 ring-zinc-700`}
    >
      {name[0]}
    </div>
  );
}
