import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Search, FileText } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { Icon } from "@/components/hub/Icon";
import { useKbArticles, useKbCategories, formatKbDate } from "@/lib/knowledge";

export const Route = createFileRoute("/kennisbank/$slug")({
  head: () => ({ meta: [{ title: "Kennisbank — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data: categories = [] } = useKbCategories();
  const { data: articles = [] } = useKbArticles();
  const [q, setQ] = useState("");

  const cat = categories.find((c) => c.slug === slug);

  const list = useMemo(() => {
    if (!cat) return [];
    const query = q.trim().toLowerCase();
    return articles
      .filter((a) => a.category_id === cat.id)
      .filter(
        (a) =>
          !query ||
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query),
      );
  }, [articles, cat, q]);

  return (
    <HubLayout>
      <div className="mx-auto max-w-4xl">
        <Link
          to="/kennisbank"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-navy"
        >
          <ChevronLeft className="h-4 w-4" /> Kennisbank
        </Link>

        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-navy">
            <Icon name={cat?.icon ?? "book-open"} size={26} />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-navy">
              {cat?.name ?? "Categorie"}
            </h1>
            {cat?.description && (
              <p className="mt-1 text-base text-foreground/70">{cat.description}</p>
            )}
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Zoek in ${cat?.name ?? "deze categorie"}…`}
            className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Nog geen artikelen in deze categorie.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {list.map((a) => (
              <li key={a.id}>
                <Link
                  to="/kennisbank/$slug/$articleSlug"
                  params={{ slug: cat!.slug, articleSlug: a.slug }}
                  className="flex items-start gap-4 p-5 transition hover:bg-accent/40"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-navy">{a.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-foreground/70">
                      {a.content.slice(0, 200)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Bijgewerkt {formatKbDate(a.updated_at)}
                      {a.author ? ` · ${a.author}` : ""}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </HubLayout>
  );
}
