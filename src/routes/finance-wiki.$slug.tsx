import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Wallet,
  ArrowLeft,
  Sparkles,
  Pencil,
  Save,
  X,
  Mail,
  MapPin,
  FileCheck2,
  Receipt,
  Hash,
  Calendar,
  AlertTriangle,
  StickyNote,
  Quote,
  BookOpen,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { PermissionGate } from "@/components/hub/PermissionGate";
import {
  useFinanceClients,
  useFinanceClientMutations,
  FINANCE_FIELDS,
  type FinanceClient,
  type FinanceClientField,
} from "@/lib/finance";
import { useKbArticles, useKbSections } from "@/lib/knowledge";

export const Route = createFileRoute("/finance-wiki/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Hoe factureer ik ${labelFromSlug(params.slug)}? — TerreVolt Intranet` },
      {
        name: "description",
        content: `Structurele instructies om correct te factureren naar ${labelFromSlug(
          params.slug,
        )}: adres, referenties, bijlagen en betaaltermijn.`,
      },
    ],
  }),
  component: () => (
    <PermissionGate
      check={(p) => p.canViewFinance}
      deniedMessage="Finance Wiki is alleen toegankelijk voor admin, management, finance of gebruikers met het recht 'Finance bekijken'."
    >
      <FinanceClientPage />
    </PermissionGate>
  ),
});

function labelFromSlug(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const FIELD_ICONS: Record<FinanceClientField, React.ComponentType<{ className?: string }>> = {
  factuuradres: MapPin,
  inkooporder_info: Hash,
  factuur_referenties: Receipt,
  verplichte_bijlagen: FileCheck2,
  btw_verlegd: ShieldCheck,
  g_rekening: Banknote,
  betaaltermijn: Calendar,
  factuur_email: Mail,
  veelgemaakte_fouten: AlertTriangle,
  voorbeeld_factuurtekst: Quote,
  interne_opmerkingen: StickyNote,
};

function FinanceClientPage() {
  const { slug } = Route.useParams();
  const { data: clients = [], isLoading } = useFinanceClients();
  const client = useMemo(() => clients.find((c) => c.slug === slug), [clients, slug]);

  if (!isLoading && !client) throw notFound();

  return (
    <HubLayout>
      <Link
        to="/finance-wiki"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Finance Wiki
      </Link>

      {isLoading || !client ? (
        <div className="h-96 animate-pulse rounded-3xl bg-muted/50" />
      ) : (
        <ClientView client={client} />
      )}
    </HubLayout>
  );
}

function ClientView({ client }: { client: FinanceClient }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FinanceClient>(client);
  const { update } = useFinanceClientMutations();

  useEffect(() => {
    setDraft(client);
  }, [client]);

  const { data: sections = [] } = useKbSections();
  const { data: articles = [] } = useKbArticles();
  const sectionById = useMemo(() => {
    const m = new Map<string, (typeof sections)[number]>();
    for (const s of sections) m.set(s.id, s);
    return m;
  }, [sections]);
  const related = useMemo(
    () => articles.filter((a) => client.related_ids.includes(a.id)),
    [articles, client.related_ids],
  );

  const save = async () => {
    const patch: Partial<FinanceClient> = {};
    for (const { key } of FINANCE_FIELDS) {
      if (draft[key] !== client[key]) patch[key] = draft[key];
    }
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    await update.mutateAsync({ id: client.id, patch });
    setEditing(false);
  };

  return (
    <>
      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-pastel/50 via-card to-lime-soft/40 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-brand">
                Finance Wiki
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                Hoe factureer ik {client.name}?
              </h1>
              {client.short_description && (
                <p className="mt-1 max-w-2xl text-sm text-foreground/70">
                  {client.short_description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setDraft(client);
                    setEditing(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground/80 shadow-sm hover:border-brand/40"
                >
                  <X className="h-3.5 w-3.5" /> Annuleren
                </button>
                <button
                  onClick={save}
                  disabled={update.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-medium text-brand-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> Opslaan
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground/80 shadow-sm hover:border-brand/40"
              >
                <Pencil className="h-3.5 w-3.5" /> Bewerken
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <span className="text-foreground/70">
            Deze pagina wordt gebruikt door de Vraagbaak als bron voor vragen over{" "}
            <span className="font-medium text-navy">{client.name}</span>.
          </span>
        </div>
      </div>

      {/* Field grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {FINANCE_FIELDS.map(({ key, label, hint }) => {
          const Icon = FIELD_ICONS[key];
          const value = draft[key];
          return (
            <div
              key={key}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-brand" />
                <h3 className="text-sm font-semibold text-navy">{label}</h3>
              </div>
              {hint && !editing && (
                <div className="mb-2 text-[11px] text-muted-foreground">{hint}</div>
              )}
              {editing ? (
                <textarea
                  value={value}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [key]: e.target.value }))
                  }
                  rows={4}
                  placeholder={hint ?? `Vul ${label.toLowerCase()} in…`}
                  className="block w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                />
              ) : value.trim() ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {value}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Nog niet ingevuld.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Related documents */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold text-navy">Gerelateerde documenten</h3>
        </div>
        {related.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen documenten gekoppeld. Koppel klantspecifieke documenten vanuit de
            kennisbank om deze hier te tonen.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {related.map((a) => {
              const sec = sectionById.get(a.section_id ?? "");
              return (
                <li key={a.id}>
                  <Link
                    to="/kennisbank/$slug/$articleSlug"
                    params={{ slug: sec?.slug ?? "item", articleSlug: a.slug }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-3 text-sm shadow-sm transition hover:border-brand/40 hover:bg-pastel/30"
                  >
                    <span className="truncate text-foreground/90">{a.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {sec?.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-pastel/40 p-5">
        <div className="text-sm text-navy">
          Twijfel je over een specifiek geval? Vraag het aan de Vraagbaak.
        </div>
        <Link
          to="/vraagbaak"
          className="rounded-xl bg-brand px-4 py-2 text-xs font-medium text-brand-foreground shadow-sm hover:opacity-90"
        >
          Open Vraagbaak
        </Link>
      </div>
    </>
  );
}
