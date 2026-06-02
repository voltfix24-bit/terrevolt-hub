import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Paperclip, ArrowUpRight } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { Icon } from "@/components/hub/Icon";
import { useKbArticles, useKbCategories, formatKbDate } from "@/lib/knowledge";

export const Route = createFileRoute("/kennisbank/$slug/$articleSlug")({
  head: () => ({ meta: [{ title: "Artikel — Kennisbank" }] }),
  component: Page,
});

function Page() {
  const { slug, articleSlug } = Route.useParams();
  const { data: categories = [] } = useKbCategories();
  const { data: articles = [] } = useKbArticles();

  const cat = categories.find((c) => c.slug === slug);
  const article = useMemo(
    () => articles.find((a) => a.slug === articleSlug && a.category_id === cat?.id),
    [articles, articleSlug, cat?.id],
  );

  const related = useMemo(() => {
    if (!article) return [];
    const ids = new Set(article.related_ids ?? []);
    return articles.filter((a) => ids.has(a.id));
  }, [articles, article]);

  const catBySlug = useMemo(() => {
    const m = new Map<string, (typeof categories)[number]>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  if (!article || !cat) {
    return (
      <HubLayout>
        <div className="mx-auto max-w-3xl">
          <Link
            to="/kennisbank"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-navy"
          >
            <ChevronLeft className="h-4 w-4" /> Kennisbank
          </Link>
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Artikel niet gevonden.
          </div>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <article className="mx-auto max-w-3xl">
        <Link
          to="/kennisbank/$slug"
          params={{ slug: cat.slug }}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-navy"
        >
          <ChevronLeft className="h-4 w-4" /> {cat.name}
        </Link>

        <header className="mb-10 border-b border-border pb-8">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-navy">
            <Icon name={cat.icon} size={12} /> {cat.name}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-navy md:text-5xl">
            {article.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {article.author && <span>Door {article.author}</span>}
            <span>Bijgewerkt {formatKbDate(article.updated_at)}</span>
          </div>
        </header>

        <div className="prose-kb whitespace-pre-wrap text-[15px] leading-7 text-foreground/85">
          {article.content || (
            <p className="italic text-muted-foreground">Nog geen inhoud.</p>
          )}
        </div>

        {article.attachments.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bijlagen
            </h2>
            <ul className="space-y-2">
              {article.attachments.map((att, i) => (
                <li key={i}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm shadow-sm transition hover:border-brand/40 hover:bg-accent/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-navy">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-navy">
                        {att.label || att.url}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{att.url}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Gerelateerde artikelen
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map((r) => {
                const rCat = catBySlug.get(r.category_id);
                return (
                  <li key={r.id}>
                    <Link
                      to="/kennisbank/$slug/$articleSlug"
                      params={{ slug: rCat?.slug ?? "", articleSlug: r.slug }}
                      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-brand/40 hover:bg-accent/40"
                    >
                      {rCat && (
                        <div className="text-xs font-medium text-brand">{rCat.name}</div>
                      )}
                      <div className="mt-1 font-medium text-navy">{r.title}</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>
    </HubLayout>
  );
}
