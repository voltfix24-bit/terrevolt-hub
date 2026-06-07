import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Paperclip, ArrowUpRight, ExternalLink, AlertTriangle } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { Icon } from "@/components/hub/Icon";
import {
  useKbArticles,
  useKbSections,
  useKbVersions,
  formatKbDate,
  effectiveStatus,
  statusColor,
  statusLabel,
  documentTypeIcon,
  documentTypeLabel,
  formatFileSize,
  isExpired,
} from "@/lib/knowledge";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/kennisbank/$slug/$articleSlug")({
  head: () => ({ meta: [{ title: "Document — Kennisbank" }] }),
  component: Page,
});

function Page() {
  const { slug, articleSlug } = Route.useParams();
  const { data: sections = [] } = useKbSections();
  const { data: articles = [] } = useKbArticles();

  const section = sections.find((s) => s.slug === slug);
  const article = useMemo(
    () => articles.find((a) => a.slug === articleSlug),
    [articles, articleSlug],
  );

  const { data: versions = [] } = useKbVersions(article?.id);

  const related = useMemo(() => {
    if (!article) return [];
    const ids = new Set(article.related_ids ?? []);
    return articles.filter((a) => ids.has(a.id));
  }, [articles, article]);

  if (!article) {
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
            Document niet gevonden.
          </div>
        </div>
      </HubLayout>
    );
  }

  const eff = effectiveStatus(article);
  const expired = isExpired(article);
  const sectionForArticle = sections.find((s) => s.id === article.section_id) ?? section;
  const isPdf = (article.file_url || "").toLowerCase().includes(".pdf");

  return (
    <HubLayout>
      <article className="mx-auto max-w-3xl">
        <Link
          to="/kennisbank"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-navy"
        >
          <ChevronLeft className="h-4 w-4" /> Kennisbank
        </Link>

        {expired && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Dit document is verlopen</div>
              <div className="text-destructive/80">
                Geldig tot {formatKbDate(article.valid_until)}. Controleer of er een nieuwere versie beschikbaar is.
              </div>
            </div>
          </div>
        )}

        <header className="mb-8 border-b border-border pb-8">
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            {sectionForArticle && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-medium text-navy">
                <Icon name={sectionForArticle.icon} size={12} /> {sectionForArticle.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground/70">
              <Icon name={documentTypeIcon(article.document_type)} size={12} />{" "}
              {documentTypeLabel(article.document_type)} · v{article.version}
            </span>
            <span className={`rounded-full px-2.5 py-1 font-medium ${statusColor(eff)}`}>
              {statusLabel(eff)}
            </span>
            {article.client && (
              <span className="inline-flex items-center rounded-full bg-pastel/50 px-2.5 py-1 font-medium text-navy">
                {article.client}
              </span>
            )}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-navy md:text-5xl">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-4 text-lg leading-relaxed text-foreground/80">{article.summary}</p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-3">
            {article.owner && <Meta label="Eigenaar" value={article.owner} />}
            {article.author && <Meta label="Auteur" value={article.author} />}
            <Meta label="Documentdatum" value={formatKbDate(article.document_date)} />
            <Meta label="Geldig vanaf" value={formatKbDate(article.valid_from)} />
            <Meta label="Geldig tot" value={formatKbDate(article.valid_until)} />
            <Meta label="Laatst bijgewerkt" value={formatKbDate(article.updated_at)} />
          </div>
          {article.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-card border border-border px-2 py-0.5 text-xs font-medium text-foreground/70"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </header>

        {article.important_notes && (
          <section className="mb-8 rounded-2xl border border-brand/30 bg-pastel/30 p-5">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">
              Belangrijke notities
            </div>
            <div className="whitespace-pre-wrap text-sm text-navy">{article.important_notes}</div>
          </section>
        )}

        {/* File / external link preview */}
        {(article.file_url || article.external_url) && (
          <section className="mb-10">
            {article.file_url && isPdf ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-navy">
                    <Paperclip className="h-4 w-4" />
                    <span className="font-medium">{article.file_name || "Document"}</span>
                    {article.file_size > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(article.file_size)}
                      </span>
                    )}
                  </span>
                  <a
                    href={article.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:opacity-90"
                  >
                    Openen <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
                <iframe
                  src={article.file_url}
                  title={article.file_name || article.title}
                  className="h-[640px] w-full bg-background"
                />
              </div>
            ) : article.file_url ? (
              <a
                href={article.file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void logAudit("document.download", { targetType: "kb_article", targetId: article.id, metadata: { title: article.title, file_name: article.file_name } })}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-brand/40 hover:bg-accent/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-navy">
                  <Icon name={documentTypeIcon(article.document_type)} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-navy">
                    {article.file_name || "Document downloaden"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {documentTypeLabel(article.document_type)}
                    {article.file_size > 0 ? ` · ${formatFileSize(article.file_size)}` : ""}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
            ) : null}

            {article.external_url && (
              <a
                href={article.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-brand/40 hover:bg-accent/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-navy">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-navy">Open in SharePoint / extern</div>
                  <div className="truncate text-xs text-muted-foreground">{article.external_url}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
            )}
          </section>
        )}

        {article.content && (
          <div className="prose-kb whitespace-pre-wrap text-[15px] leading-7 text-foreground/85">
            {article.content}
          </div>
        )}

        {article.attachments.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Aanvullende bijlagen
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

        {versions.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Versiegeschiedenis
            </h2>
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-navy">v{v.version}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatKbDate(v.created_at)}
                      {v.author ? ` · ${v.author}` : ""}
                    </div>
                  </div>
                  {v.note && (
                    <div className="mt-1 text-xs text-foreground/70">{v.note}</div>
                  )}
                  {v.file_url && (
                    <a
                      href={v.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                    >
                      Bestand bekijken <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Gerelateerde documenten
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map((r) => {
                const rSec = sections.find((s) => s.id === r.section_id);
                return (
                  <li key={r.id}>
                    <Link
                      to="/kennisbank/$slug/$articleSlug"
                      params={{
                        slug: rSec?.slug ?? slug,
                        articleSlug: r.slug,
                      }}
                      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-brand/40 hover:bg-accent/40"
                    >
                      {rSec && (
                        <div className="text-xs font-medium text-brand">{rSec.name}</div>
                      )}
                      <div className="mt-1 font-medium text-navy">{r.title}</div>
                      {r.summary && (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {r.summary}
                        </div>
                      )}
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </div>
      <div className="text-sm text-foreground/85">{value}</div>
    </div>
  );
}
