import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { Search, AlertTriangle, Sparkles, Clock, Pin } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { Icon } from "@/components/hub/Icon";
import {
  useKbArticles,
  useKbSections,
  formatKbDate,
  effectiveStatus,
  statusColor,
  statusLabel,
  isExpired,
  isExpiringSoon,
  documentTypeIcon,
  documentTypeLabel,
} from "@/lib/knowledge";


export const Route = createFileRoute("/kennisbank")({
  head: () => ({
    meta: [
      { title: "Kennisbank — TerreVolt Intranet" },
      {
        name: "description",
        content:
          "Doorzoek alle bedrijfskennis: techniek, finance, processen en opdrachtgever-eisen.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <IndexPage />;
}

function IndexPage() {
  const [q, setQ] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  const { data: sections = [] } = useKbSections();
  const { data: articles = [] } = useKbArticles();

  const sectionById = useMemo(() => {
    const m = new Map<string, (typeof sections)[number]>();
    for (const s of sections) m.set(s.id, s);
    return m;
  }, [sections]);

  const clients = useMemo(() => {
    const set = new Set<string>();
    for (const a of articles) if (a.client) set.add(a.client);
    return Array.from(set).sort();
  }, [articles]);

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (a.status === "archived") return false;
      if (activeSection && a.section_id !== activeSection) return false;
      if (activeClient && a.client !== activeClient) return false;
      if (activeType && a.document_type !== activeType) return false;
      const eff = effectiveStatus(a);
      if (activeStatus && eff !== activeStatus) return false;
      if (!query) return true;
      const hay = [
        a.title,
        a.summary,
        a.content,
        a.client,
        a.owner,
        a.author,
        a.version,
        ...(a.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [articles, query, activeSection, activeClient, activeStatus, activeType]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of articles) {
      if (a.status === "archived") continue;
      if (a.section_id) m.set(a.section_id, (m.get(a.section_id) ?? 0) + 1);
    }
    return m;
  }, [articles]);

  const recent = useMemo(
    () =>
      articles
        .filter((a) => a.status === "active" && !isExpired(a))
        .slice()
        .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
        .slice(0, 6),
    [articles],
  );
  const important = useMemo(
    () => articles.filter((a) => a.important_notes && a.status !== "archived").slice(0, 6),
    [articles],
  );
  const expiring = useMemo(
    () =>
      articles
        .filter((a) => a.status !== "archived" && (isExpired(a) || isExpiringSoon(a)))
        .slice()
        .sort((a, b) => {
          const aDate = a.valid_until ?? "";
          const bDate = b.valid_until ?? "";
          return aDate.localeCompare(bDate);
        })
        .slice(0, 8),
    [articles],
  );

  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Kennisbank"
          subtitle="Alle bedrijfskennis op één plek. Doorzoek documenten, instructies en eisen — of vraag de assistent."
        />

        {/* Search + ask assistant */}
        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek in titel, samenvatting, tags, opdrachtgever…"
              className="w-full rounded-lg border border-border bg-card h-11 pl-11 pr-4 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-navy">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy">Liever een vraag stellen?</div>
              <div className="text-xs text-muted-foreground">
                De Vraagbaak zoekt in kennisbank, nieuws, collega's, applicaties en meer.
              </div>
            </div>
          </div>
          <Link
            to="/vraagbaak"
            search={{ q: q.trim() || undefined }}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-navy px-4 text-sm font-medium text-brand-foreground hover:opacity-90"
          >
            Open Vraagbaak
          </Link>
        </div>

        {/* Filters — compact selects, stack on mobile */}
        <div className="mb-6 mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <FilterSelect
            label="Sectie"
            value={activeSection}
            onChange={setActiveSection}
            allLabel="Alle secties"
            options={sections.map((s) => ({ value: s.id, label: s.name }))}
          />
          <FilterSelect
            label="Status"
            value={activeStatus}
            onChange={setActiveStatus}
            allLabel="Alle statussen"
            options={(["active", "expired", "draft"] as const).map((st) => ({ value: st, label: statusLabel(st) }))}
          />
          <FilterSelect
            label="Opdrachtgever"
            value={activeClient}
            onChange={setActiveClient}
            allLabel="Alle opdrachtgevers"
            options={clients.map((c) => ({ value: c, label: c }))}
          />
        </div>

        {/* Section grid (no filter / no query) */}
        {!query && !activeSection && !activeClient && !activeStatus && !activeType && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className="group relative flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-brand/50"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
                      <Icon name={sec.icon} size={22} />
                    </div>
                    <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-brand">
                      {counts.get(sec.id) ?? 0} items
                    </span>
                  </div>
                  <div className="relative">
                    <div className="text-lg font-semibold tracking-tight text-navy">
                      {sec.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-foreground/70">
                      {sec.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Expired warnings */}
            {expiring.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h2 className="text-base font-semibold text-navy">
                    Verlopen of binnenkort verlopend
                  </h2>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {expiring.map((a) => (
                    <ItemRow key={a.id} a={a} section={sectionById.get(a.section_id ?? "")} />
                  ))}
                </ul>
              </section>
            )}

            {/* Important docs */}
            {important.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <Pin className="h-4 w-4 text-brand" />
                  <h2 className="text-base font-semibold text-navy">Belangrijke documenten</h2>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {important.map((a) => (
                    <ItemRow key={a.id} a={a} section={sectionById.get(a.section_id ?? "")} />
                  ))}
                </ul>
              </section>
            )}

            {/* Recent */}
            {recent.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-navy">Recent bijgewerkt</h2>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recent.map((a) => (
                    <ItemRow key={a.id} a={a} section={sectionById.get(a.section_id ?? "")} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* Filtered results list */}
        {(query || activeSection || activeClient || activeStatus || activeType) && (
          <div>
            <div className="mb-3 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "resultaat" : "resultaten"}
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
                Geen kennisitems gevonden met deze filters.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {filtered.map((a) => (
                  <ItemRow
                    key={a.id}
                    a={a}
                    section={sectionById.get(a.section_id ?? "")}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </HubLayout>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-navy outline-none focus:ring-2 focus:ring-brand/30"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ItemRow({
  a,
  section,
}: {
  a: import("@/lib/knowledge").KbArticle;
  section?: { slug: string; name: string };
}) {
  const sectionName = section?.name;
  const eff = effectiveStatus(a);
  return (
    <li>
      <Link
        to="/kennisbank/$slug/$articleSlug"
        params={{ slug: section?.slug ?? "item", articleSlug: a.slug }}
        className="group flex h-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-brand/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
          <Icon name={documentTypeIcon(a.document_type)} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="min-w-0 break-words font-medium leading-snug text-navy">{a.title}</div>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColor(eff)}`}
            >
              {statusLabel(eff)}
            </span>
            {a.important_notes && (
              <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                <Sparkles className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
                Belangrijk
              </span>
            )}
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-foreground/70">
            {a.summary || a.content.slice(0, 180)}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {sectionName && <span>{sectionName}</span>}
            {a.client && <span>· {a.client}</span>}
            <span>· {documentTypeLabel(a.document_type)} v{a.version}</span>
            {a.valid_until && <span>· geldig t/m {formatKbDate(a.valid_until)}</span>}
          </div>
        </div>
      </Link>
    </li>
  );
}
