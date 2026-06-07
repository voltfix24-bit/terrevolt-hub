import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, ArrowUpRight, Sparkles, FileText } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { PermissionGate } from "@/components/hub/PermissionGate";
import { useFinanceClients, financeClientCompletion } from "@/lib/finance";
import { logAudit } from "@/lib/audit";


export const Route = createFileRoute("/finance-wiki")({
  head: () => ({
    meta: [
      { title: "Finance Wiki — TerreVolt Intranet" },
      {
        name: "description",
        content:
          "Per opdrachtgever: hoe je correct factureert, welke bijlagen je meestuurt en op welke valkuilen je moet letten.",
      },
    ],
  }),
  component: () => (
    <PermissionGate
      check={(p) => p.canViewFinance}
      deniedMessage="Finance Wiki is alleen toegankelijk voor admin, management, finance of gebruikers met het recht 'Finance bekijken'."
    >
      <FinanceWikiPage />
    </PermissionGate>
  ),
});

function FinanceWikiPage() {
  const { data: clients = [], isLoading } = useFinanceClients();
  const active = clients.filter((c) => !c.archived);

  return (
    <HubLayout>
      <SectionHeader
        title="Finance Wiki — Hoe factureer ik welke opdrachtgever?"
        subtitle="Per klant gestructureerde instructies: factuuradres, referenties, bijlagen, BTW, G-rekening en betaaltermijn. De Vraagbaak gebruikt deze pagina's als bron."
      />

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand/30 bg-gradient-to-br from-pastel/40 via-card to-lime-soft/30 p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-medium text-navy">Vraag het direct aan de Vraagbaak</div>
          <div className="text-xs text-foreground/70">
            Bijv. <span className="italic">“Hoe factureer ik Van Gelder?”</span> — antwoord komt uit deze wiki.
          </div>
        </div>
        <Link
          to="/vraagbaak"
          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground shadow-sm hover:opacity-90"
        >
          Open Vraagbaak
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted/50" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((c) => {
            const pct = financeClientCompletion(c);
            return (
              <Link
                key={c.id}
                to="/finance-wiki/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pastel text-brand">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-brand" />
                </div>
                <div>
                  <div className="text-base font-semibold text-navy">{c.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {c.short_description}
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Volledigheid
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </HubLayout>
  );
}
