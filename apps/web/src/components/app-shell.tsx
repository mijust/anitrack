"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { SearchTrigger, useCommandSearch } from "@/components/command-search";
import { ClockIcon, CompassIcon, ListIcon, MoonIcon, SearchIcon, SparklesIcon, SunIcon } from "@/components/icons";
import { useWatchlist } from "@/components/watchlist-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Entdecken", icon: CompassIcon },
  { href: "/active", label: "Active", icon: ClockIcon },
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

  const activeCount = useMemo(
    () => entries.filter((e) => e.status === "watching").length,
    [entries],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight transition hover:opacity-90">
          <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-[13px] font-bold text-white shadow-xs shadow-indigo-500/25 ring-1 ring-white/20">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">Anitrack</span>
        </Link>

        <nav aria-label="Hauptnavigation" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-sm transition-all",
                isActive(href)
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {label}
              {href === "/active" && activeCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-sky-400 border border-sky-500/30">
                  <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" />
                  {activeCount}
                </span>
              )}
              {href === "/liste" && entries.length > 0 && (
                <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold tabular-nums text-accent">
                  {entries.length}
                </span>
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
      className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
              isActive(href) ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
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
