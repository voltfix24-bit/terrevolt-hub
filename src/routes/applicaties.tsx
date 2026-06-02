import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { AppCard } from "@/components/hub/AppCard";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { useActiveApplications, APP_CATEGORIES } from "@/lib/applications";

export const Route = createFileRoute("/applicaties")({
  head: () => ({ meta: [{ title: "Applicaties — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const { data: apps = [], isLoading } = useActiveApplications();
  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeader title="Applicaties" subtitle="Alle interne tools op één plek." />
        {isLoading && (
          <div className="text-sm text-muted-foreground">Laden…</div>
        )}
        {APP_CATEGORIES.map((cat) => {
          const inCat = apps.filter((a) => a.category === cat);
          if (inCat.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-4 text-lg font-semibold text-navy">{cat}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {inCat.map((a) => <AppCard key={a.id} app={a} />)}
              </div>
            </section>
          );
        })}
        {!isLoading && apps.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nog geen applicaties.
          </div>
        )}
      </div>
    </HubLayout>
  );
}
