import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, ExternalLink, Cloud, Folder } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { Icon } from "@/components/hub/Icon";
import {
  useKbArticles,
  useKbSections,
  documentTypeIcon,
  documentTypeLabel,
  formatKbDate,
  KB_DOCUMENT_TYPES,
  effectiveStatus,
  statusLabel,
  statusColor,
} from "@/lib/knowledge";
import { useSharePointItems, useSharePointMutations } from "@/lib/sharepoint";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/documenten")({
  head: () => ({
    meta: [
      { title: "Documenten — TerreVolt Intranet" },
      {
        name: "description",
        content: "Overzicht van alle documenten uit de kennisbank en SharePoint-ingangen.",
      },
      { property: "og:title", content: "Documenten — TerreVolt Intranet" },
      {
        property: "og:description",
        content: "Zoek en open interne documenten en SharePoint-mappen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const articles = useKbArticles();
  const { data: sections = [] } = useKbSections();
  const sp = useSharePointItems();
  const { touch } = useSharePointMutations();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [section, setSection] = useState("");

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const term = q.trim().toLowerCase();

  // Only real documents: articles with an attached file or external document link.
  const docs = useMemo(
    () =>
      (articles.data ?? [])
        .filter((a) => a.status !== "archived" && (a.file_url || a.external_url))
        .filter((a) => !type || a.document_type === type)
        .filter((a) => !section || a.section_id === section)
        .filter((a) =>
          !term
            ? true
            : [a.title, a.summary, a.client, a.version, a.file_name, ...(a.tags ?? [])]
                .join(" ")
                .toLowerCase()
                .includes(term),
        )
        .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1)),
    [articles.data, type, section, term],
  );

  const spItems = useMemo(
    () =>
      (sp.data ?? []).filter((i) =>
        !term ? true : `${i.name} ${i.description}`.toLowerCase().includes(term),
      ),
    [sp.data, term],
  );

  const usedTypes = useMemo(() => {
    const set = new Set(
      (articles.data ?? []).filter((a) => a.file_url || a.external_url).map((a) => a.document_type),
    );
    return KB_DOCUMENT_TYPES.filter((t) => set.has(t));
  }, [articles.data]);

  return (
    <HubLayout>
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          as="h1"
          title="Documenten"
          subtitle="Bestanden uit de kennisbank en SharePoint-ingangen waar je toegang toe hebt."
        />

        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek op titel, opdrachtgever, tag…"
              aria-label="Zoek documenten"
              className="h-11 w-full min-w-0 rounded-lg border border-border bg-card pl-9 pr-3 outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            aria-label="Sectie"
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3"
          >
            <option value="">Alle secties</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Documenttype"
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3"
          >
            <option value="">Alle typen</option>
            {usedTypes.map((t) => (
              <option key={t} value={t}>
                {documentTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0">
            <h2 className="mb-2 text-sm font-semibold text-navy">
              Kennisbankdocumenten{" "}
              {!articles.isLoading && (
                <span className="font-normal text-muted-foreground">({docs.length})</span>
              )}
            </h2>
            {articles.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : articles.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Documenten konden niet geladen worden.
              </div>
            ) : docs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {term || type || section
                  ? "Geen documenten gevonden met deze filters."
                  : "Er zijn nog geen documenten."}
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map((a) => {
                  const sec = a.section_id ? sectionById.get(a.section_id) : undefined;
                  const href = a.file_url || a.external_url;
                  return (
                    <li
                      key={a.id}
                      className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-navy">
                          <Icon name={documentTypeIcon(a.document_type)} size={17} />
                        </div>
                        <div className="min-w-0">
                          {sec ? (
                            <Link
                              to="/kennisbank/$slug/$articleSlug"
                              params={{ slug: sec.slug, articleSlug: a.slug }}
                              className="break-words font-medium leading-snug text-navy [overflow-wrap:anywhere] hover:text-brand"
                            >
                              {a.title}
                            </Link>
                          ) : (
                            <span className="break-words font-medium leading-snug text-navy">
                              {a.title}
                            </span>
                          )}
                          {effectiveStatus(a) !== "active" && (
                            <span
                              className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(effectiveStatus(a))}`}
                            >
                              {statusLabel(effectiveStatus(a))}
                            </span>
                          )}
                          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                            <span>
                              {documentTypeLabel(a.document_type)}
                              {a.version ? ` v${a.version}` : ""}
                            </span>
                            {sec && <span>· {sec.name}</span>}
                            {a.client && <span>· {a.client}</span>}
                            <span>· {formatKbDate(a.updated_at)}</span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          void logAudit(a.file_url ? "document.download" : "document.open", {
                            targetType: "kb_article",
                            targetId: a.id,
                            metadata: { title: a.title },
                          })
                        }
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-md border border-border px-3 text-sm font-medium text-navy hover:bg-secondary sm:self-auto"
                      >
                        {a.file_url ? (
                          <Download className="h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        {a.file_url ? "Openen" : "Link"}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="min-w-0">
            <h2 className="mb-2 text-sm font-semibold text-navy">SharePoint</h2>
            {sp.isLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            ) : sp.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                SharePoint-ingangen konden niet geladen worden.
              </div>
            ) : spItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Geen SharePoint-ingangen gevonden.
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {spItems.map((i) => (
                  <li key={i.id}>
                    <a
                      href={i.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => touch.mutate(i.id)}
                      className="flex min-w-0 items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-secondary"
                    >
                      {i.kind === "folder" ? (
                        <Folder className="h-4 w-4 shrink-0 text-brand" />
                      ) : (
                        <Cloud className="h-4 w-4 shrink-0 text-brand" />
                      )}
                      <span className="min-w-0 flex-1 break-words text-navy">{i.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/sharepoint"
              className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
            >
              Naar SharePoint-overzicht
            </Link>
          </aside>
        </div>
      </div>
    </HubLayout>
  );
}
