import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Users, ArrowUpRight } from "lucide-react";
import { usePeople, initials } from "@/lib/people";

export function PeopleSearchWidget() {
  const { data: people = [] } = usePeople();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return people
      .filter((p) => !p.archived)
      .filter((p) => {
        const hay = [p.full_name, p.job_title, p.department, p.phone, p.person_type]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 5);
  }, [people, q]);

  return (
    <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-lime-soft/30 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Users className="h-4 w-4 text-brand" /> Snel collega zoeken
        </div>
        <Link to="/smoelenboek" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          Smoelenboek <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Naam, rol of telefoon…"
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand/50"
        />
      </div>

      {q && (
        <div className="mt-3 space-y-1">
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background/60 p-4 text-center text-xs text-muted-foreground">
              Geen collega gevonden.
            </div>
          ) : (
            results.map((p) => (
              <Link
                key={p.id}
                to="/smoelenboek/$id"
                params={{ id: p.id }}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent/60"
              >
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.full_name} className="h-9 w-9 rounded-full object-cover border border-border" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pastel text-xs font-semibold text-navy">
                    {initials(p.full_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-navy">{p.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.job_title || p.person_type}{p.phone && ` · ${p.phone}`}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
