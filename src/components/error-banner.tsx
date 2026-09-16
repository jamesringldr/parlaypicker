export async function ErrorBanner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;
  return (
    <p role="alert" className="rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
      {error}
    </p>
  );
}
