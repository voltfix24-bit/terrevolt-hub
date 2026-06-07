import { useEffect } from "react";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { usePerms } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/auth"]);

export function AuthRequired({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const navigate = useNavigate();
  const perms = usePerms();

  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublic) return;
    if (!perms.ready) return;
    if (!perms.user) {
      navigate({
        to: "/auth",
        search: { redirect: href },
        replace: true,
      });
    }
  }, [isPublic, perms.ready, perms.user, href, navigate]);

  if (isPublic) return <>{children}</>;

  if (!perms.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!perms.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (perms.role && !perms.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Lock className="h-6 w-6 text-navy" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-navy">Account inactief</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Je account is gedeactiveerd. Neem contact op met een beheerder.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent"
          >
            Uitloggen
          </Link>
        </div>
      </div>
    );
  }

  if (!perms.role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Lock className="h-6 w-6 text-navy" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-navy">Nog geen toegang</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Je account is nog niet geactiveerd door een beheerder.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
