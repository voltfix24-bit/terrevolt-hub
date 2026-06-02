import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { Placeholder } from "@/components/hub/Placeholder";

export const Route = createFileRoute("/instellingen")({
  head: () => ({ meta: [{ title: "Instellingen — TerreVolt Hub" }] }),
  component: () => (
    <HubLayout>
      <Placeholder title="Instellingen" description="Beheer je profiel en voorkeuren." />
    </HubLayout>
  ),
});
