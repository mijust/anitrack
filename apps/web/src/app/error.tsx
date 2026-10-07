"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <p className="text-sm font-medium text-accent">Etwas ist schiefgelaufen</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Diese Ansicht konnte nicht geladen werden.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Prüfe, ob die API läuft, und versuche es erneut.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
