import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { useHubStore } from "@/lib/hub-store";

export const Route = createFileRoute("/kennisbank")({
  head: () => ({ meta: [{ title: "Kennisbank — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const knowledge = useHubStore((s) => s.knowledge);
  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="Kennisbank" subtitle="Interne kennis, procedures en richtlijnen." />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {knowledge.map((cat) => (
            <a key={cat.id} href={`/kennisbank/${cat.slug}`}
               className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl">{cat.icon}</div>
              <div>
                <div className="font-semibold text-navy">{cat.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{cat.description}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </HubLayout>
  );
}
