import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { useHubStore } from "@/lib/hub-store";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/partnerportalen")({
  head: () => ({ meta: [{ title: "Partnerportalen — TerreVolt Hub" }] }),
  component: Page,
});

function Page() {
  const partners = useHubStore((s) => s.partners);
  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="Partnerportalen" subtitle="Directe toegang tot externe omgevingen." />
        <div className="flex flex-wrap gap-3">
          {partners.map((p) => (
            <a key={p.id} href={p.href} target="_blank" rel="noopener noreferrer"
               className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-navy shadow-sm transition-all hover:border-brand/40 hover:bg-accent">
              <span className="h-2 w-2 rounded-full bg-brand" />
              {p.name}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ))}
        </div>
      </div>
    </HubLayout>
  );
}
