import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { AskAssistant } from "@/components/hub/AskAssistant";

export const Route = createFileRoute("/kennisbank")({
  head: () => ({
    meta: [
      { title: "Kennisbank — TerreVolt Hub" },
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
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek in titel, samenvatting, tags, opdrachtgever…"
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <AskAssistant articles={articles} sections={sections} />

        {/* Filters */}
        <div className="mt-8 mb-6 flex flex-wrap items-center gap-2 text-xs">
          <FilterPill
            label="Alle secties"
            active={!activeSection}
            onClick={() => setActiveSection(null)}
          />
          {sections.map((s) => (
            <FilterPill
              key={s.id}
              label={s.name}
              active={activeSection === s.id}
              onClick={() =>
                setActiveSection(activeSection === s.id ? null : s.id)
              }
            />
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {(["active", "expired", "draft"] as const).map((st) => (
            <FilterPill
              key={st}
              label={statusLabel(st)}
              tone={st === "expired" ? "warn" : st === "draft" ? "muted" : "ok"}
              active={activeStatus === st}
              onClick={() => setActiveStatus(activeStatus === st ? null : st)}
            />
          ))}
          {clients.length > 0 && <span className="mx-1 h-4 w-px bg-border" />}
          {clients.slice(0, 6).map((c) => (
            <FilterPill
              key={c}
              label={c}
              active={activeClient === c}
              onClick={() => setActiveClient(activeClient === c ? null : c)}
            />
          ))}
        </div>

        {/* Section grid (no filter / no query) */}
        {!query && !activeSection && !activeClient && !activeStatus && !activeType && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-accent/30 p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40"
                >
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-pastel/40 blur-2xl transition-opacity group-hover:opacity-80" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
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
              <section className="mt-12">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h2 className="text-base font-semibold text-navy">
                    Verlopen of binnenkort verlopend
                  </h2>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {expiring.map((a) => (
                    <ItemRow key={a.id} a={a} sectionName={sectionById.get(a.section_id ?? "")?.name} />
                  ))}
                </ul>
              </section>
            )}

            {/* Important docs */}
            {important.length > 0 && (
              <section className="mt-12">
                <div className="mb-4 flex items-center gap-2">
                  <Pin className="h-4 w-4 text-brand" />
                  <h2 className="text-base font-semibold text-navy">Belangrijke documenten</h2>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {important.map((a) => (
                    <ItemRow key={a.id} a={a} sectionName={sectionById.get(a.section_id ?? "")?.name} />
                  ))}
                </ul>
              </section>
            )}

            {/* Recent */}
            {recent.length > 0 && (
              <section className="mt-12">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-navy">Recent bijgewerkt</h2>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recent.map((a) => (
                    <ItemRow key={a.id} a={a} sectionName={sectionById.get(a.section_id ?? "")?.name} />
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
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
                Geen kennisitems gevonden met deze filters.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {filtered.map((a) => (
                  <ItemRow
                    key={a.id}
                    a={a}
                    sectionName={sectionById.get(a.section_id ?? "")?.name}
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

function FilterPill({
  label,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "ok" | "warn" | "muted";
}) {
  const toneClass = active
    ? tone === "warn"
      ? "bg-destructive text-destructive-foreground border-destructive"
      : tone === "muted"
        ? "bg-navy text-white border-navy"
        : "bg-brand text-brand-foreground border-brand"
    : "bg-card text-foreground/70 border-border hover:bg-accent hover:text-navy";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 font-medium transition ${toneClass}`}
    >
      {label}
    </button>
  );
}

function ItemRow({
  a,
  sectionName,
}: {
  a: import("@/lib/knowledge").KbArticle;
  sectionName?: string;
}) {
  const eff = effectiveStatus(a);
  return (
    <li>
      <Link
        to="/kennisbank/$slug/$articleSlug"
        params={{ slug: sectionName ? slugifyClient(sectionName) : "item", articleSlug: a.slug }}
        className="group flex h-full items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
          <Icon name={documentTypeIcon(a.document_type)} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="truncate font-medium text-navy">{a.title}</div>
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

function slugifyClient(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
