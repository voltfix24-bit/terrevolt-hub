import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { AppCard } from "@/components/hub/AppCard";
import { NewsCard } from "@/components/hub/NewsCard";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { Icon } from "@/components/hub/Icon";
import { RoleWidgets } from "@/components/hub/RoleWidgets";
import { PeopleSearchWidget } from "@/components/hub/PeopleSearchWidget";
import { useActivePartnerLinks } from "@/lib/partners";
import { useActiveQuickLinks } from "@/lib/quickLinks";
import { useSession, useCurrentRole } from "@/lib/auth";
import { roleLabel } from "@/lib/userRoles";
import { useActiveApplications } from "@/lib/applications";
import { usePublishedNews } from "@/lib/news";
import { useKbSections } from "@/lib/knowledge";
import {
  useRecentSharePointLinks,
  useFavoriteSharePointFolders,
  useFavoriteSharePointLinks,
  useSharePointMutations,
} from "@/lib/sharepoint";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TerreVolt Hub — Dashboard" },
      { name: "description", content: "Het centrale digitale startpunt voor TerreVolt medewerkers." },
      { property: "og:title", content: "TerreVolt Hub" },
      { property: "og:description", content: "Snel toegang tot alle interne tools, nieuws en partnerportalen." },
    ],
  }),
  component: Dashboard,
});

function computeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

function Dashboard() {
  const { user } = useSession();
  const { data: roleRow } = useCurrentRole(user);
  const displayName =
    roleRow?.display_name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";
  const roleText = roleRow ? roleLabel(roleRow.role) : "gast";
  const { data: apps = [], isLoading } = useActiveApplications();
  const { data: news = [] } = usePublishedNews();
  const {
    data: partners = [],
    isLoading: partnersLoading,
    error: partnersError,
  } = useActivePartnerLinks();
  const {
    data: quickLinks = [],
    isLoading: quickLinksLoading,
    error: quickLinksError,
  } = useActiveQuickLinks();
  const { data: knowledge = [] } = useKbSections();
  const { data: spRecent = [] } = useRecentSharePointLinks(6);
  const { data: spFavFolders = [] } = useFavoriteSharePointFolders();
  const { data: spQuickAccess = [] } = useFavoriteSharePointLinks();
  const { touch: spTouch } = useSharePointMutations();

  const [appQuery, setAppQuery] = useState("");
  const q = appQuery.trim().toLowerCase();
  const filteredApps = q
    ? apps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      )
    : apps;
  const featured = filteredApps.filter((a) => a.featured);
  const others = filteredApps.filter((a) => !a.featured);
  // Avoid SSR/client hydration mismatch — render a stable greeting first, then localise.
  const [greeting, setGreeting] = useState("Welkom");
  useEffect(() => {
    setGreeting(computeGreeting());
  }, []);

  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Welcome */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-accent/40 p-6 sm:p-8 lg:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-pastel/40 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-medium text-brand">TerreVolt Hub</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl lg:text-5xl">
              {greeting}{displayName ? ` ${displayName}` : ""}
            </h1>
            <p className="mt-3 text-base text-foreground/70">
              Welkom terug — je werkt als <span className="font-semibold text-navy">{roleText}</span>.
            </p>
            {quickLinksLoading && (
              <div className="mt-6 flex flex-wrap gap-2" aria-busy="true" aria-label="Quick links laden">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-accent/60" />
                ))}
              </div>
            )}
            {!quickLinksLoading && quickLinksError && (
              <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
                Quick links konden niet geladen worden.
              </div>
            )}
            {!quickLinksLoading && !quickLinksError && quickLinks.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {quickLinks.map((q) => (
                  <a
                    key={q.id}
                    href={q.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-sm font-medium text-navy shadow-sm transition-all hover:border-brand/40 hover:bg-accent"
                  >
                    {q.icon && <Icon name={q.icon} size={16} className="text-brand" />}
                    {q.name}
                  </a>
                ))}
              </div>
            )}

          </div>
        </section>

        {/* Role widgets + people search */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <SectionHeader
              title={`Jouw ${roleText.toLowerCase()}-dashboard`}
              subtitle="Widgets afgestemd op jouw rol in TerreVolt Hub."
            />
            <RoleWidgets />
          </div>
          <div className="lg:pt-9">
            <PeopleSearchWidget />
          </div>
        </section>

        {/* Applications */}
        <section>
          <SectionHeader title="Applicaties" subtitle="Open snel je dagelijkse tools en omgevingen." />
          <div className="mb-5">
            <input
              type="search"
              value={appQuery}
              onChange={(e) => setAppQuery(e.target.value)}
              placeholder="Zoek apps op naam of categorie…"
              className="w-full max-w-md rounded-full border border-border bg-card px-4 py-2 text-sm text-navy shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
          </div>
          {featured.length > 0 && (
            <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              {featured.map((app) => <AppCard key={app.id} app={app} large />)}
            </div>
          )}
          {others.length > 0 && (
            <div className="mt-4 grid auto-rows-fr grid-cols-1 gap-4 sm:mt-5 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {others.map((app) => <AppCard key={app.id} app={app} />)}
            </div>
          )}
          {!isLoading && apps.length > 0 && filteredApps.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              Geen apps gevonden voor "{appQuery}".
            </div>
          )}
          {!isLoading && apps.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              Nog geen applicaties. Voeg er een toe via Instellingen.
            </div>
          )}
        </section>

        {/* News */}
        <section>
          <SectionHeader
            title="Laatste nieuws"
            subtitle="Updates van TerreVolt en de branche."
            action={
              <a href="/nieuws" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                Alles bekijken <ArrowUpRight className="h-4 w-4" />
              </a>
            }
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => <NewsCard key={item.id} item={item} />)}
          </div>
        </section>

        {/* Partner portals */}
        <section>
          <SectionHeader title="Partnerportalen" subtitle="Directe toegang tot externe omgevingen." />
          <div className="flex flex-wrap gap-3">
            {partners.map((p) => (
              <a key={p.id} href={p.href} target="_blank" rel="noopener noreferrer"
                 className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-navy shadow-sm transition-all hover:border-brand/40 hover:bg-accent">
                {p.icon ? (
                  <Icon name={p.icon} size={16} className="text-brand" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-brand" />
                )}
                {p.name}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

            ))}
          </div>
        </section>

        {/* SharePoint */}
        {(spRecent.length > 0 || spFavFolders.length > 0 || spQuickAccess.length > 0) && (
          <section>
            <SectionHeader
              title="SharePoint"
              subtitle="Recente links, favoriete mappen en snelle toegang."
              action={
                <a href="/sharepoint" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  Beheren <ArrowUpRight className="h-4 w-4" />
                </a>
              }
            />

            {spQuickAccess.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {spQuickAccess.map((q) => (
                  <a
                    key={q.id}
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => spTouch.mutate(q.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-navy shadow-sm transition-all hover:border-brand/40 hover:bg-accent"
                  >
                    <Icon name={q.icon} size={16} className="text-brand" />
                    {q.name}
                  </a>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {spRecent.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
                    <Icon name="link" size={16} className="text-brand" /> Recente SharePoint links
                  </div>
                  <ul className="divide-y divide-border">
                    {spRecent.map((item) => (
                      <li key={item.id}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => spTouch.mutate(item.id)}
                          className="group flex items-center gap-3 py-2.5"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-navy">
                            <Icon name={item.icon} size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-navy">{item.name}</div>
                            {item.description && (
                              <div className="truncate text-xs text-muted-foreground">{item.description}</div>
                            )}
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {spFavFolders.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
                    <Icon name="folder" size={16} className="text-brand" /> Favoriete mappen
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {spFavFolders.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => spTouch.mutate(f.id)}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-background p-3 transition-all hover:border-brand/40 hover:bg-accent"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-navy">
                          <Icon name={f.icon} size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-navy">{f.name}</div>
                          {f.description && (
                            <div className="truncate text-xs text-muted-foreground">{f.description}</div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Knowledge base */}
        <section className="pb-8">
          <SectionHeader title="Kennisbank" subtitle="Vind procedures, richtlijnen en interne kennis." />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {knowledge.map((cat) => (
              <a key={cat.id} href={`/kennisbank/${cat.slug}`}
                 className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy"><Icon name={cat.icon} size={20} /></div>
                <div>
                  <div className="font-semibold text-navy">{cat.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{cat.description}</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </HubLayout>
  );
}
