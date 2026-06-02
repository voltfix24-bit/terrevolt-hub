import { Bell, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Zoek in TerreVolt Hub..."
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>

      <button
        type="button"
        aria-label="Meldingen"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground/70 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand" />
      </button>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card pl-1 pr-3 py-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-pastel text-sm font-semibold text-white">
          H
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-medium">Hassan</div>
          <div className="text-xs text-muted-foreground">Medewerker</div>
        </div>
      </div>
    </header>
  );
}
