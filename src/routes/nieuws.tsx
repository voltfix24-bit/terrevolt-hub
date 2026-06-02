import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { NewsCard } from "@/components/hub/NewsCard";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { news } from "@/lib/hub-data";

export const Route = createFileRoute("/nieuws")({
  head: () => ({ meta: [{ title: "Nieuws — TerreVolt Hub" }] }),
  component: () => (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="Nieuws" subtitle="Alle updates van TerreVolt." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {news.map((n) => <NewsCard key={n.id} item={n} />)}
        </div>
      </div>
    </HubLayout>
  ),
});
