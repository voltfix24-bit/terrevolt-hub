import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, FileText, Search, Cloud, ExternalLink, Clock } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { AppCard } from "@/components/hub/AppCard";
import { Icon } from "@/components/hub/Icon";
import { PeopleSearchWidget } from "@/components/hub/PeopleSearchWidget";
import { useActivePartnerLinks } from "@/lib/partners";
import { useActiveQuickLinks } from "@/lib/quickLinks";
import { useSession, useCurrentRole } from "@/lib/auth";
import { useActiveApplications } from "@/lib/applications";
import { usePublishedNews, formatNewsDate } from "@/lib/news";
import { useKbArticles, useKbSections, isExpired, formatKbDate } from "@/lib/knowledge";
import { useFavoriteSharePointLinks, useFavoriteSharePointFolders, useSharePointMutations } from "@/lib/sharepoint";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Startpagina — TerreVolt Intranet" },
      { name: "description", content: "Het centrale startpunt voor TerreVolt medewerkers: tools, kennis en nieuws." },
      { property: "og:title", content: "Startpagina — TerreVolt Intranet" },
      { property: "og:description", content: "Snel naar interne tools, kennisbank, documenten en het laatste nieuws." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const APP_LIMIT = 6;

function computeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-semibold text-navy">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function StateBox({ kind, children }: { kind: "empty" | "error"; children: ReactNode }) {
  return (
    <div
      className={
        kind === "error"
          ? "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          : "rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground"
      }
    >
      {children}
    </div>
  );
}

function Skeleton({ rows = 3, h = "h-10" }: { rows?: number; h?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Laden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${h} animate-pulse rounded-md bg-muted`} />
      ))}
    </div>
  );
}

function Dashboard() {
  const { user } = useSession();
  const { data: roleRow } = useCurrentRole(user);
  const displayName =
    roleRow?.display_name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";

  const apps = useActiveApplications();
  const news = usePublishedNews();
  const articles = useKbArticles();
  const { data: sections = [] } = useKbSections();
  const partners = useActivePartnerLinks();
  const quickLinks = useActiveQuickLinks();
  const { data: spLinks = [] } = useFavoriteSharePointLinks();
  const { data: spFolders = [] } = useFavoriteSharePointFolders();
  const { touch: spTouch } = useSharePointMutations();

  const [greeting, setGreeting] = useState("Welkom");
  useEffect(() => setGreeting(computeGreeting()), []);

  const appList = apps.data ?? [];
  const topApps = useMemo(() => {
    const featured = appList.filter((a) => a.featured);
    const rest = appList.filter((a) => !a.featured);
    return [...featured, ...rest].slice(0, APP_LIMIT);
  }, [appList]);

  const sectionSlug = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const recentKb = useMemo(
    () =>
      (articles.data ?? [])
        .filter((a) => a.status === "active" && !isExpired(a) && a.section_id && sectionSlug.has(a.section_id))
        .slice()
        .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
        .slice(0, 5),
    [articles.data, sectionSlug],
  );

  const sp = [...spLinks, ...spFolders].slice(0, 5);
  const partnerList = (partners.data ?? []).slice(0, 5);

  return (
    <HubLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <header className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">TerreVolt Intranet</p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
            {greeting}
            {displayName ? `, ${displayName}` : ""}
          </h1>
          {!quickLinks.isLoading && !quickLinks.error && (quickLinks.data ?? []).length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {(quickLinks.data ?? []).map((q) => (
                <li key={q.id}>
                  <a
                    href={q.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-navy hover:border-brand/50"
                  >
                    {q.icon && <Icon name={q.icon} size={15} className="text-brand" />}
                    {q.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {quickLinks.error && (
            <p className="mt-2 text-sm text-destructive">Snelkoppelingen konden niet geladen worden.</p>
          )}
        </header>

        {/* Information entry points */}
        <nav aria-label="Informatie" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { to: "/vraagbaak", icon: Search, title: "Vraagbaak", text: "Stel een vraag over alles in het intranet" },
            { to: "/kennisbank", icon: BookOpen, title: "Kennisbank", text: "Procedures, eisen en werkinstructies" },
            { to: "/documenten", icon: FileText, title: "Documenten", text: "Alle bestanden en SharePoint-ingangen" },
          ].map((e) => (
            <Link
              key={e.to}
              to={e.to}
              className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-brand/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-pastel">
                <e.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-navy">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.text}</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-brand" />
            </Link>
          ))}
        </nav>

        {/* Applications */}
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-navy">Veelgebruikte applicaties</h2>
            <MoreLink to="/applicaties">Alle applicaties</MoreLink>
          </div>
          {apps.isLoading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[68px] animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : apps.error ? (
            <StateBox kind="error">Applicaties konden niet geladen worden.</StateBox>
          ) : topApps.length === 0 ? (
            <StateBox kind="empty">Er zijn nog geen applicaties beschikbaar.</StateBox>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topApps.map((app) => (
                <AppCard key={app.id} app={app} compact />
              ))}
            </div>
          )}
        </section>

        {/* News + knowledge */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Laatste nieuws" action={<MoreLink to="/nieuws">Al het nieuws</MoreLink>}>
            {news.isLoading ? (
              <Skeleton />
            ) : news.error ? (
              <StateBox kind="error">Nieuws kon niet geladen worden.</StateBox>
            ) : news.data.length === 0 ? (
              <StateBox kind="empty">Nog geen nieuwsberichten.</StateBox>
            ) : (
              <ul className="divide-y divide-border">
                {news.data.slice(0, 3).map((n) => (
                  <li key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link to="/nieuws" hash={n.id} className="block min-w-0 hover:text-brand">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{formatNewsDate(n.publish_date)}</span>
                        {n.category && <span>· {n.category}</span>}
                        {n.important && <span className="font-medium text-brand">· Belangrijk</span>}
                      </div>
                      <div className="mt-0.5 break-words font-medium leading-snug text-navy">{n.title}</div>
                      {n.summary && <p className="mt-0.5 line-clamp-2 text-sm text-foreground/70">{n.summary}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent bijgewerkte kennis" action={<MoreLink to="/kennisbank">Kennisbank</MoreLink>}>
            {articles.isLoading ? (
              <Skeleton rows={4} />
            ) : articles.error ? (
              <StateBox kind="error">Kennisbank kon niet geladen worden.</StateBox>
            ) : recentKb.length === 0 ? (
              <StateBox kind="empty">Nog geen actuele kennisartikelen.</StateBox>
            ) : (
              <ul className="divide-y divide-border">
                {recentKb.map((a) => (
                  <li key={a.id} className="py-2 first:pt-0 last:pb-0">
                    <Link
                      to="/kennisbank/$slug/$articleSlug"
                      params={{ slug: sectionSlug.get(a.section_id!)!.slug, articleSlug: a.slug }}
                      className="block min-w-0 hover:text-brand"
                    >
                      <div className="break-words text-sm font-medium leading-snug text-navy">{a.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatKbDate(a.updated_at)}</span>
                        <span>· {sectionSlug.get(a.section_id!)!.name}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Compact extras */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PeopleSearchWidget />

          <Panel title="Partnerportalen" action={<MoreLink to="/partnerportalen">Alle</MoreLink>}>
            {partners.isLoading ? (
              <Skeleton rows={3} h="h-8" />
            ) : partners.error ? (
              <StateBox kind="error">Partnerportalen konden niet geladen worden.</StateBox>
            ) : partnerList.length === 0 ? (
              <StateBox kind="empty">Nog geen partnerportalen.</StateBox>
            ) : (
              <ul className="space-y-1">
                {partnerList.map((p) => (
                  <li key={p.id}>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-9 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-navy hover:bg-secondary"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand" />
                      <span className="min-w-0 truncate">{p.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="SharePoint-favorieten" action={<MoreLink to="/sharepoint">SharePoint</MoreLink>}>
            {sp.length === 0 ? (
              <StateBox kind="empty">Nog geen favorieten ingesteld.</StateBox>
            ) : (
              <ul className="space-y-1">
                {sp.map((i) => (
                  <li key={i.id}>
                    <a
                      href={i.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => spTouch.mutate(i.id)}
                      className="flex min-h-9 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-navy hover:bg-secondary"
                    >
                      {i.icon ? (
                        <Icon name={i.icon} size={15} className="shrink-0 text-brand" />
                      ) : (
                        <Cloud className="h-3.5 w-3.5 shrink-0 text-brand" />
                      )}
                      <span className="min-w-0 truncate">{i.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </HubLayout>
  );
}
