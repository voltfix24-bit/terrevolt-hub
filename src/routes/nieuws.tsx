import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { NewsCard } from "@/components/hub/NewsCard";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { usePublishedNews } from "@/lib/news";

export const Route = createFileRoute("/nieuws")({
  head: () => ({ meta: [{ title: "Nieuws — TerreVolt Intranet" }] }),
  component: Page,
});

function Page() {
  const { data: news = [], isLoading } = usePublishedNews();
  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="Nieuws" subtitle="Alle updates van TerreVolt." />
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Laden…</div>
        ) : news.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nog geen nieuwsberichten.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => <NewsCard key={n.id} item={n} />)}
          </div>
        )}
      </div>
    </HubLayout>
  );
}
