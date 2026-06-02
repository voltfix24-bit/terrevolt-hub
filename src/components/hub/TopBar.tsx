import { Bell, ChevronDown, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useHubStore, ROLES, type Role } from "@/lib/hub-store";

export function TopBar() {
  const role = useHubStore((s) => s.role);
  const setRole = useHubStore((s) => s.setRole);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 rounded-xl border border-border bg-card pl-1 pr-3 py-1 hover:bg-accent"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-pastel text-sm font-semibold text-white">
            H
          </div>
          <div className="hidden sm:block leading-tight text-left">
            <div className="text-sm font-medium">Hassan</div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-border bg-card p-2 shadow-lg">
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rol wisselen
            </div>
            <div className="space-y-0.5">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r as Role);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
                    role === r
                      ? "bg-brand text-brand-foreground"
                      : "text-foreground/80 hover:bg-accent",
                  ].join(" ")}
                >
                  <span>{r}</span>
                  {role === r && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
