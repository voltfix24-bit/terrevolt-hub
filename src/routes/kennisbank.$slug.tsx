import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { Placeholder } from "@/components/hub/Placeholder";
import { knowledge } from "@/lib/hub-data";

export const Route = createFileRoute("/kennisbank/$slug")({
  head: () => ({ meta: [{ title: "Kennisbank — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const cat = knowledge.find((k) => k.slug === slug);
  return (
    <HubLayout>
      <Placeholder
        title={cat?.name ?? "Categorie"}
        description={cat?.description ?? "Inhoud wordt binnenkort toegevoegd."}
      />
    </HubLayout>
  );
}
