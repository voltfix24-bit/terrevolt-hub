import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { AppCard } from "@/components/hub/AppCard";
import { NewsCard } from "@/components/hub/NewsCard";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { Icon } from "@/components/hub/Icon";
import { useHubStore } from "@/lib/hub-store";
import { useActiveApplications } from "@/lib/applications";
import { usePublishedNews } from "@/lib/news";
import { ArrowUpRight } from "lucide-react";

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

function Dashboard() {
  const { data: apps = [], isLoading } = useActiveApplications();
  const { data: news = [] } = usePublishedNews();
  const partners = useHubStore((s) => s.partners);
  const quickLinks = useHubStore((s) => s.quickLinks);
  const knowledge = useHubStore((s) => s.knowledge);

  const featured = apps.filter((a) => a.featured);
  const others = apps.filter((a) => !a.featured);
  const greeting = getGreeting();

  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Welcome */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-accent/40 p-8 lg:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-pastel/40 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-medium text-brand">TerreVolt Hub</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-navy lg:text-5xl">
              {greeting} Hassan
            </h1>
            <p className="mt-3 text-base text-foreground/70">
              Welkom terug in TerreVolt Hub
            </p>
            {quickLinks.length > 0 && (
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

        {/* Applications */}
        <section>
          <SectionHeader title="Applicaties" subtitle="Open snel je dagelijkse tools en omgevingen." />
          {featured.length > 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {featured.map((app) => <AppCard key={app.id} app={app} large />)}
            </div>
          )}
          {others.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((app) => <AppCard key={app.id} app={app} />)}
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
                <span className="h-2 w-2 rounded-full bg-brand" />
                {p.name}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ))}
          </div>
        </section>

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
