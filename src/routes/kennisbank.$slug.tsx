import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { ChevronLeft, Search, FileText, ChevronDown, Folder } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { Icon } from "@/components/hub/Icon";
import {
  useKbArticles,
  useKbSections,
  useKbCategories,
  formatKbDate,
  effectiveStatus,
  statusColor,
  statusLabel,
  documentTypeIcon,
  documentTypeLabel,
  slugify,
} from "@/lib/knowledge";

export const Route = createFileRoute("/kennisbank/$slug")({
  head: () => ({ meta: [{ title: "Kennisbank — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data: sections = [] } = useKbSections();
  const { data: articles = [] } = useKbArticles();
  const { data: categories = [] } = useKbCategories();
  const [q, setQ] = useState("");
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const section = sections.find((s) => s.slug === slug);

  const inSection = useMemo(
    () => articles.filter((a) => section && a.section_id === section.id),
    [articles, section],
  );

  const clients = useMemo(() => {
    const set = new Set<string>();
    for (const a of inSection) if (a.client) set.add(a.client);
    return Array.from(set).sort();
  }, [inSection]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return inSection.filter((a) => {
      if (a.status === "archived") return false;
      if (activeStatus && effectiveStatus(a) !== activeStatus) return false;
      if (activeClient && a.client !== activeClient) return false;
      if (!query) return true;
      const hay = [a.title, a.summary, a.content, ...(a.tags ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [inSection, q, activeStatus, activeClient]);

  return (
    <HubLayout>
      <div className="mx-auto max-w-5xl">
        <Link
          to="/kennisbank"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-navy"
        >
          <ChevronLeft className="h-4 w-4" /> Kennisbank
        </Link>

        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
            <Icon name={section?.icon ?? "book-open"} size={26} />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-navy">
              {section?.name ?? "Sectie"}
            </h1>
            {section?.description && (
              <p className="mt-1 text-base text-foreground/70">{section.description}</p>
            )}
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Zoek in ${section?.name ?? "deze sectie"}…`}
            className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          {(["active", "expired", "draft"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setActiveStatus(activeStatus === st ? null : st)}
              className={`rounded-full border px-3 py-1.5 font-medium transition ${
                activeStatus === st
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-card text-foreground/70 hover:bg-accent"
              }`}
            >
              {statusLabel(st)}
            </button>
          ))}
          {clients.map((c) => (
            <button
              key={c}
              onClick={() => setActiveClient(activeClient === c ? null : c)}
              className={`rounded-full border px-3 py-1.5 font-medium transition ${
                activeClient === c
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-card text-foreground/70 hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Geen kennisitems in deze sectie.
          </div>
        ) : (() => {
          const usedCatIds = Array.from(new Set(list.map((a) => a.category_id).filter(Boolean) as string[]));
          const sectionCats = categories
            .filter((c) => usedCatIds.includes(c.id))
            .sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
          const ungrouped = list.filter((a) => !a.category_id);

          const renderArticle = (a: typeof list[number]) => {
            const eff = effectiveStatus(a);
            return (
              <li key={a.id}>
                <Link
                  to="/kennisbank/$slug/$articleSlug"
                  params={{ slug: section ? section.slug : slugify(slug), articleSlug: a.slug }}
                  className="flex items-start gap-4 p-5 transition hover:bg-accent/40"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                    <Icon name={documentTypeIcon(a.document_type)} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-navy">{a.title}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(eff)}`}>
                        {statusLabel(eff)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                        {documentTypeLabel(a.document_type)} v{a.version}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-foreground/70">
                      {a.summary || a.content.slice(0, 200)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Bijgewerkt {formatKbDate(a.updated_at)}</span>
                      {a.owner && <span>· Eigenaar {a.owner}</span>}
                      {a.client && <span>· {a.client}</span>}
                      {a.valid_until && <span>· geldig t/m {formatKbDate(a.valid_until)}</span>}
                    </div>
                  </div>
                  <FileText className="mt-1 h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            );
          };

          return (
            <div className="space-y-4">
              {ungrouped.length > 0 && (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  {ungrouped.map(renderArticle)}
                </ul>
              )}
              {sectionCats.map((c) => {
                const inCat = list.filter((a) => a.category_id === c.id);
                const isOpen = openCats[c.id] ?? (!!q || sectionCats.length === 1);
                return (
                  <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpenCats((s) => ({ ...s, [c.id]: !isOpen }))}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-accent/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                        <Folder className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-navy">{c.name}</div>
                        {c.description && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.description}</div>
                        )}
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                        {inCat.length}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-border border-t border-border">
                        {inCat.map(renderArticle)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </HubLayout>
  );
}
