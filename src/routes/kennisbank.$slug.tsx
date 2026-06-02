import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { Placeholder } from "@/components/hub/Placeholder";
import { useHubStore } from "@/lib/hub-store";

export const Route = createFileRoute("/kennisbank/$slug")({
  head: () => ({ meta: [{ title: "Kennisbank — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const cat = useHubStore((s) => s.knowledge.find((k) => k.slug === slug));
  return (
    <HubLayout>
      <Placeholder
        title={cat?.name ?? "Categorie"}
        description={cat?.description ?? "Inhoud wordt binnenkort toegevoegd."}
      />
    </HubLayout>
  );
}
