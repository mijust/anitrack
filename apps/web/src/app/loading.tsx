export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 sm:px-10" aria-busy="true">
      <div className="h-5 w-32 animate-pulse rounded bg-surface" />
      <div className="mt-5 h-12 max-w-xl animate-pulse rounded bg-surface" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-lg bg-surface" />)}
      </div>
    </main>
  );
}
