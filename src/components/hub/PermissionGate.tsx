import { Link } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { usePerms, type AppPermission } from "@/lib/auth";
import type { AppRole } from "@/lib/userRoles";
import { HubLayout } from "./HubLayout";

type Props = {
  /** Allowed roles (any match grants access). */
  roles?: AppRole[];
  /** Required permissions (any one grants access; admin always passes). */
  permissions?: AppPermission[];
  /** Custom check: if provided, overrides roles+permissions. */
  check?: (p: ReturnType<typeof usePerms>) => boolean;
  /** Message shown when access is denied. */
  deniedMessage?: string;
  children: React.ReactNode;
};

export function PermissionGate({
  roles,
  permissions,
  check,
  deniedMessage,
  children,
}: Props) {
  const perms = usePerms();

  if (!perms.ready) {
    return (
      <HubLayout>
        <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Toegang controleren…
        </div>
      </HubLayout>
    );
  }

  let allowed = false;
  if (check) {
    allowed = check(perms);
  } else {
    const roleOk = roles ? perms.hasRole(...roles) : false;
    const permOk = permissions ? permissions.some((p) => perms.canManage(p) || perms.hasPermission(p)) : false;
    allowed = perms.isAdmin || roleOk || permOk;
  }

  if (!allowed) {
    return (
      <HubLayout>
        <div className="mx-auto max-w-md py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pastel">
            <Lock className="h-6 w-6 text-navy" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-navy">Geen toegang</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {deniedMessage ?? "Je hebt geen rechten om deze pagina te bekijken."}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent"
          >
            Terug naar dashboard
          </Link>
        </div>
      </HubLayout>
    );
  }

  return <>{children}</>;
}
