import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { Icon } from "@/components/hub/Icon";
import { useKbArticles, useKbCategories, formatKbDate } from "@/lib/knowledge";

export const Route = createFileRoute("/kennisbank")({
  head: () => ({ meta: [{ title: "Kennisbank — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const { data: categories = [] } = useKbCategories();
  const { data: articles = [] } = useKbArticles();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of articles) m.set(a.category_id, (m.get(a.category_id) ?? 0) + 1);
    return m;
  }, [articles]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    return articles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.author.toLowerCase().includes(query),
      )
      .slice(0, 50);
  }, [articles, query]);

  const catBySlug = useMemo(() => {
    const m = new Map<string, (typeof categories)[number]>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="Kennisbank" subtitle="Interne kennis, procedures en richtlijnen." />

        <div className="relative mb-8 max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek in alle artikelen…"
            className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {query ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "resultaat" : "resultaten"} voor "{q}"
            </div>
            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                Geen artikelen gevonden.
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {results.map((a) => {
                  const cat = catBySlug.get(a.category_id);
                  return (
                    <li key={a.id}>
                      <Link
                        to="/kennisbank/$slug/$articleSlug"
                        params={{ slug: cat?.slug ?? "", articleSlug: a.slug }}
                        className="block p-4 transition hover:bg-accent/40"
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {cat && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-navy">
                              <Icon name={cat.icon} size={12} /> {cat.name}
                            </span>
                          )}
                          <span>{formatKbDate(a.updated_at)}</span>
                        </div>
                        <div className="mt-1 font-medium text-navy">{a.title}</div>
                        <div className="mt-1 line-clamp-1 text-sm text-foreground/70">
                          {a.content.slice(0, 180)}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to="/kennisbank/$slug"
                params={{ slug: cat.slug }}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
                  <Icon name={cat.icon} size={20} />
                </div>
                <div>
                  <div className="font-semibold text-navy">{cat.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {cat.description}
                  </div>
                  <div className="mt-2 text-xs font-medium text-brand">
                    {counts.get(cat.id) ?? 0} artikelen
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </HubLayout>
  );
}
