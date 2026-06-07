import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HubLayout } from "@/components/hub/HubLayout";
import { AppCard } from "@/components/hub/AppCard";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { useActiveApplications, APP_CATEGORIES } from "@/lib/applications";

export const Route = createFileRoute("/applicaties")({
  head: () => ({ meta: [{ title: "Applicaties — TerreVolt Intranet" }] }),
  component: Page,
});

function Page() {
  const { data: apps = [], isLoading } = useActiveApplications();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? apps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      )
    : apps;

  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeader title="Applicaties" subtitle="Alle interne tools op één plek." />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek apps op naam of categorie…"
          className="w-full max-w-md rounded-full border border-border bg-card px-4 py-2 text-sm text-navy shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        />
        {isLoading && (
          <div className="text-sm text-muted-foreground">Laden…</div>
        )}
        {APP_CATEGORIES.map((cat) => {
          const inCat = filtered.filter((a) => a.category === cat);
          if (inCat.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-4 text-lg font-semibold text-navy">{cat}</h2>
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inCat.map((a) => <AppCard key={a.id} app={a} />)}
              </div>
            </section>
          );
        })}
        {!isLoading && apps.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Geen apps gevonden voor "{query}".
          </div>
        )}
        {!isLoading && apps.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nog geen applicaties.
          </div>
        )}
      </div>
    </HubLayout>
  );
}
