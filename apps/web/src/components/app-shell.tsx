"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { SearchTrigger, useCommandSearch } from "@/components/command-search";
import { CompassIcon, ListIcon, MoonIcon, SearchIcon, SparklesIcon, SunIcon } from "@/components/icons";
import { useWatchlist } from "@/components/watchlist-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Entdecken", icon: CompassIcon },
  { href: "/liste", label: "Meine Liste", icon: ListIcon },
  { href: "/ask", label: "KI-Assistent", icon: SparklesIcon },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function AppHeader() {
  const isActive = useIsActive();
  const { entries } = useWatchlist();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-accent text-[13px] font-bold text-accent-foreground">
            A
          </span>
          <span>Anitrack</span>
        </Link>

        <nav aria-label="Hauptnavigation" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm transition-colors",
                isActive(href) ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {href === "/liste" && entries.length > 0 && (
                <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] tabular-nums">{entries.length}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger className="hidden w-64 sm:flex" />
          <MobileSearchButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function MobileSearchButton() {
  const { openSearch } = useCommandSearch();
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      aria-label="Suchen"
      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
    >
      <SearchIcon />
    </button>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Farbschema wechseln"
      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </button>
  );
}

export function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="grid grid-cols-3">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
              isActive(href) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon width={20} height={20} className={cn(isActive(href) && "text-accent")} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
