import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useSession, useCurrentRole } from "@/lib/auth";
import { HubLayout } from "./HubLayout";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const { data: role, isLoading: roleLoading } = useCurrentRole(user);

  if (loading || (user && roleLoading)) {
    return (
      <HubLayout>
        <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Laden...
        </div>
      </HubLayout>
    );
  }

  if (!user) {
    return (
      <HubLayout>
        <div className="mx-auto max-w-md py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pastel">
            <Lock className="h-6 w-6 text-navy" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-navy">Inloggen vereist</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Je moet ingelogd zijn als beheerder om deze pagina te bekijken.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm hover:opacity-90"
          >
            Inloggen
          </Link>
        </div>
      </HubLayout>
    );
  }

  if (role?.role !== "admin") {
    return (
      <HubLayout>
        <div className="mx-auto max-w-md py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pastel">
            <Lock className="h-6 w-6 text-navy" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-navy">Geen toegang</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Deze pagina is alleen beschikbaar voor beheerders.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent">
            Terug naar dashboard
          </Link>
        </div>
      </HubLayout>
    );
  }

  return <>{children}</>;
}
