import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { Placeholder } from "@/components/hub/Placeholder";

export const Route = createFileRoute("/documenten")({
  head: () => ({ meta: [{ title: "Documenten — TerreVolt Intranet" }] }),
  component: () => (
    <HubLayout>
      <Placeholder title="Documenten" description="Centrale documentomgeving wordt geïntegreerd met SharePoint." />
    </HubLayout>
  ),
});
