"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">Anime Tracker</p>
      <h1 className="mt-4 text-3xl font-semibold text-text">Diese Ansicht konnte nicht geladen werden.</h1>
      <p className="mt-3 text-text-muted">Prüfe die Verbindung zur API und versuche es erneut.</p>
      <button type="button" onClick={() => reset()} className="mx-auto mt-6 rounded-md bg-primary px-5 py-3 font-semibold text-background hover:bg-primary-hover">Erneut versuchen</button>
    </main>
  );
}
