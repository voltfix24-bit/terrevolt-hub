import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { AppCard } from "@/components/hub/AppCard";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { apps } from "@/lib/hub-data";

export const Route = createFileRoute("/applicaties")({
  head: () => ({ meta: [{ title: "Applicaties — TerreVolt Hub" }] }),
  component: () => (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="Applicaties" subtitle="Alle interne tools op één plek." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => <AppCard key={a.id} app={a} />)}
        </div>
      </div>
    </HubLayout>
  ),
});
