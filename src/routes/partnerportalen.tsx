import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { Icon } from "@/components/hub/Icon";
import { useActivePartnerLinks, PARTNER_CATEGORIES } from "@/lib/partners";
import { ArrowUpRight, Search } from "lucide-react";

export const Route = createFileRoute("/partnerportalen")({
  head: () => ({ meta: [{ title: "Partnerportalen — TerreVolt Intranet" }] }),
  component: Page,
});

function Page() {
  const { data: partners = [], isLoading } = useActivePartnerLinks();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return partners.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.href.toLowerCase().includes(needle)
      );
    });
  }, [partners, q, cat]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Partnerportalen"
          subtitle="Directe toegang tot externe omgevingen van opdrachtgevers, leveranciers en onderaannemers."
        />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek op naam, omschrijving of URL"
              className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCat("")}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-medium",
                cat === ""
                  ? "bg-brand text-brand-foreground"
                  : "border border-border bg-card text-foreground/70 hover:bg-accent",
              ].join(" ")}
            >
              Alle
            </button>
            {PARTNER_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium",
                  cat === c
                    ? "bg-brand text-brand-foreground"
                    : "border border-border bg-card text-foreground/70 hover:bg-accent",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Laden…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Geen partnerportalen gevonden.
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map(([category, list]) => (
              <section key={category}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => (
                    <a
                      key={p.id}
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                        <Icon name={p.icon} size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium text-navy">{p.name}</div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </div>
                        {p.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-foreground/70">
                            {p.description}
                          </p>
                        )}
                        <div className="mt-2 truncate text-xs text-muted-foreground">{p.href}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </HubLayout>
  );
}
