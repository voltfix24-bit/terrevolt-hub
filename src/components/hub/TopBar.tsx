import { ChevronDown, Search, LogOut, LogIn, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSession, useCurrentRole, signOut } from "@/lib/auth";
import { roleLabel } from "@/lib/userRoles";

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const { data: role } = useCurrentRole(user);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const displayName =
    role?.display_name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    navigate({ to: "/vraagbaak", search: { q } });
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Menu openen"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground/80 hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {pathname !== "/vraagbaak" ? (
        <form role="search" onSubmit={onSearch} className="relative min-w-0 flex-1 sm:max-w-lg">
          <label htmlFor="global-search" className="sr-only">
            Zoeken in het intranet
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="global-search"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek in kennis, collega's, apps…"
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-card pl-9 pr-3 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </form>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      {!user ? (
        <Link
          to="/auth"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-brand-foreground hover:opacity-90"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Inloggen</span>
        </Link>
      ) : (
        <div className="relative shrink-0" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Account"
            aria-expanded={open}
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card pl-1 pr-2 hover:bg-secondary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy text-sm font-semibold text-brand-foreground">
              {initial}
            </div>
            <div className="hidden max-w-40 text-left leading-tight lg:block">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {role ? roleLabel(role.role) : "Gebruiker"}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-card p-2 shadow-lg">
              <div className="px-3 py-2">
                <div className="truncate text-sm font-medium text-navy">{displayName}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                {role && <div className="mt-0.5 text-xs text-muted-foreground">{roleLabel(role.role)}</div>}
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={async () => {
                  await signOut();
                  setOpen(false);
                  navigate({ to: "/" });
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
