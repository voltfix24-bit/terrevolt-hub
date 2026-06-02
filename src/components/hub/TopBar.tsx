import { Bell, ChevronDown, Search, LogOut, LogIn } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSession, useCurrentRole, signOut } from "@/lib/auth";
import { roleLabel } from "@/lib/userRoles";

export function TopBar() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: role } = useCurrentRole(user);
  const [open, setOpen] = useState(false);
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

      {!user ? (
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm hover:opacity-90"
        >
          <LogIn className="h-4 w-4" />
          Inloggen
        </Link>
      ) : (
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card pl-1 pr-3 py-1 hover:bg-accent"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-pastel text-sm font-semibold text-white">
              {initial}
            </div>
            <div className="hidden sm:block leading-tight text-left">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">
                {role ? roleLabel(role.role) : "Gebruiker"}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-border bg-card p-2 shadow-lg">
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-navy">{displayName}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={async () => {
                  await signOut();
                  setOpen(false);
                  navigate({ to: "/" });
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-accent"
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
