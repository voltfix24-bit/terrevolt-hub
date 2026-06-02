import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import {
  usePeople,
  usePeopleMutations,
  PERSON_TYPES,
  PERSON_STATUSES,
  EMPLOYMENT_TYPES,
  STATUS_STYLES,
  initials,
  isAdminRole,
  type Person,
  type PersonStatus,
} from "@/lib/people";
import { useHubStore } from "@/lib/hub-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Phone, Mail, MapPin, LayoutGrid, List, Copy, Plus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/smoelenboek")({
  head: () => ({
    meta: [
      { title: "Smoelenboek — TerreVolt Hub" },
      { name: "description", content: "Vind snel collega's, monteurs, ZZP'ers en partners." },
    ],
  }),
  component: SmoelenboekPage,
});

type View = "grid" | "list";

function SmoelenboekPage() {
  const role = useHubStore((s) => s.role);
  const admin = isAdminRole(role);
  const { data: people = [], isLoading } = usePeople();

  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  const [employment, setEmployment] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [view, setView] = useState<View>("grid");
  const [editing, setEditing] = useState<Person | null>(null);
  const [creating, setCreating] = useState(false);

  const departments = useMemo(
    () => Array.from(new Set(people.map((p) => p.department).filter(Boolean))).sort(),
    [people],
  );
  const locations = useMemo(
    () => Array.from(new Set(people.map((p) => p.location).filter(Boolean))).sort(),
    [people],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return people.filter((p) => {
      if (p.archived) return false;
      if (dept && p.department !== dept) return false;
      if (type && p.person_type !== type) return false;
      if (loc && p.location !== loc) return false;
      if (employment && p.employment_type !== employment) return false;
      if (status && p.status !== status) return false;
      if (!term) return true;
      const hay = [p.full_name, p.job_title, p.department, p.phone, p.email, p.location, ...p.certifications]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [people, q, dept, type, loc, employment, status]);

  const reset = () => {
    setQ(""); setDept(""); setType(""); setLoc(""); setEmployment(""); setStatus("");
  };

  return (
    <HubLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <SectionHeader
          title="Smoelenboek"
          subtitle="Vind collega's, ZZP'ers en partners. Filter op rol, afdeling of locatie."
          action={
            admin && (
              <Button onClick={() => setCreating(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Nieuw profiel
              </Button>
            )
          }
        />

        {/* Search + view toggle */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Zoek op naam, rol, telefoon of certificaat…"
                className="pl-9 h-11 rounded-xl bg-background"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
              <button
                onClick={() => setView("grid")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${view === "grid" ? "bg-brand text-brand-foreground" : "text-foreground/70"}`}
              >
                <LayoutGrid className="h-4 w-4" /> Grid
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${view === "list" ? "bg-brand text-brand-foreground" : "text-foreground/70"}`}
              >
                <List className="h-4 w-4" /> Lijst
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            <FilterSelect label="Afdeling" value={dept} setValue={setDept} options={departments} />
            <FilterSelect label="Rol" value={type} setValue={setType} options={[...PERSON_TYPES]} />
            <FilterSelect label="Locatie" value={loc} setValue={setLoc} options={locations} />
            <FilterSelect label="Dienstverband" value={employment} setValue={setEmployment} options={[...EMPLOYMENT_TYPES]} />
            <FilterSelect label="Status" value={status} setValue={setStatus} options={[...PERSON_STATUSES]} />
          </div>

          {(q || dept || type || loc || employment || status) && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} resultaten</span>
              <button onClick={reset} className="inline-flex items-center gap-1 text-brand hover:underline">
                <X className="h-3 w-3" /> Filters wissen
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
            Laden…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
            Geen profielen gevonden met deze filters.
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProfileCard key={p.id} person={p} admin={admin} onEdit={() => setEditing(p)} />
            ))}
          </div>
        ) : (
          <PeopleList people={filtered} admin={admin} onEdit={(p) => setEditing(p)} />
        )}
      </div>

      {(creating || editing) && (
        <PersonEditor
          person={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </HubLayout>
  );
}

function FilterSelect({
  label, value, setValue, options,
}: { label: string; value: string; setValue: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
    >
      <option value="">{label}: alles</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ProfileCard({ person, admin, onEdit }: { person: Person; admin: boolean; onEdit: () => void }) {
  return (
    <div className="group relative flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40">
      <Link to="/smoelenboek/$id" params={{ id: person.id }} className="flex items-start gap-4">
        <Avatar person={person} size={56} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-navy">{person.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">{person.job_title || person.person_type}</div>
          <div className="mt-1 truncate text-xs text-foreground/60">{person.department}</div>
        </div>
      </Link>

      <div className="mt-4 space-y-1.5 text-xs text-foreground/80">
        {person.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-brand" />
            <span className="truncate">{person.phone}</span>
          </div>
        )}
        {person.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-brand" />
            <span className="truncate">{person.email}</span>
          </div>
        )}
        {person.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            <span className="truncate">{person.location}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={person.status} />
        <QuickActions person={person} />
      </div>

      {admin && (
        <button
          onClick={(e) => { e.preventDefault(); onEdit(); }}
          className="absolute right-3 top-3 rounded-lg bg-background/80 p-1.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
          title="Bewerken"
        >
          <Pencil className="h-3.5 w-3.5 text-foreground/70" />
        </button>
      )}
    </div>
  );
}

function PeopleList({ people, admin, onEdit }: { people: Person[]; admin: boolean; onEdit: (p: Person) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-accent/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Naam</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Afdeling</th>
            <th className="px-4 py-3">Telefoon</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Locatie</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Acties</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {people.map((p) => (
            <tr key={p.id} className="hover:bg-accent/30">
              <td className="px-4 py-3">
                <Link to="/smoelenboek/$id" params={{ id: p.id }} className="flex items-center gap-3">
                  <Avatar person={p} size={32} />
                  <span className="font-medium text-navy">{p.full_name}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-foreground/80">{p.job_title || p.person_type}</td>
              <td className="px-4 py-3 text-foreground/80">{p.department}</td>
              <td className="px-4 py-3 text-foreground/80">{p.phone}</td>
              <td className="px-4 py-3 text-foreground/80">{p.email}</td>
              <td className="px-4 py-3 text-foreground/80">{p.location}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <QuickActions person={p} />
                  {admin && (
                    <button onClick={() => onEdit(p)} className="rounded-lg p-1.5 hover:bg-accent" title="Bewerken">
                      <Pencil className="h-3.5 w-3.5 text-foreground/70" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  if (person.photo_url) {
    return (
      <img
        src={person.photo_url}
        alt={person.full_name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-border"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-pastel to-lime-soft font-semibold text-navy"
    >
      {initials(person.full_name)}
    </div>
  );
}

export function StatusBadge({ status }: { status: PersonStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status}
    </span>
  );
}

export function QuickActions({ person }: { person: Person }) {
  const copyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!person.phone) return;
    navigator.clipboard.writeText(person.phone);
    toast.success("Telefoonnummer gekopieerd");
  };
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {person.phone && (
        <a href={`tel:${person.phone}`} title="Bellen" className="rounded-lg p-1.5 hover:bg-accent">
          <Phone className="h-3.5 w-3.5 text-brand" />
        </a>
      )}
      {person.email && (
        <a href={`mailto:${person.email}`} title="E-mail" className="rounded-lg p-1.5 hover:bg-accent">
          <Mail className="h-3.5 w-3.5 text-brand" />
        </a>
      )}
      {person.phone && (
        <button onClick={copyPhone} title="Kopieer nummer" className="rounded-lg p-1.5 hover:bg-accent">
          <Copy className="h-3.5 w-3.5 text-foreground/70" />
        </button>
      )}
    </div>
  );
}

/* -------- Editor -------- */

function PersonEditor({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const { create, update, remove } = usePeopleMutations();
  const empty: Partial<Person> = {
    full_name: "",
    job_title: "",
    department: "",
    person_type: "Medewerker",
    employment_type: "Vast",
    status: "Beschikbaar",
    photo_url: "",
    phone: "",
    email: "",
    location: "",
    projects: [],
    certifications: [],
    bei_authorization: "",
    vehicle: "",
    equipment: "",
    emergency_contact: "",
    emergency_admin_only: true,
    notes: "",
  };
  const [form, setForm] = useState<Partial<Person>>(person ?? empty);
  const setF = <K extends keyof Person>(k: K, v: Person[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.full_name?.trim()) { toast.error("Naam is verplicht"); return; }
    try {
      if (person) {
        await update.mutateAsync({ id: person.id, patch: form });
        toast.success("Profiel bijgewerkt");
      } else {
        await create.mutateAsync({ ...form, full_name: form.full_name } as Person);
        toast.success("Profiel toegevoegd");
      }
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const del = async () => {
    if (!person) return;
    if (!confirm(`Profiel ${person.full_name} verwijderen?`)) return;
    await remove.mutateAsync(person.id);
    toast.success("Profiel verwijderd");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">{person ? "Profiel bewerken" : "Nieuw profiel"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Volledige naam *"><Input value={form.full_name ?? ""} onChange={(e) => setF("full_name", e.target.value)} /></Field>
          <Field label="Functietitel"><Input value={form.job_title ?? ""} onChange={(e) => setF("job_title", e.target.value)} /></Field>
          <Field label="Afdeling"><Input value={form.department ?? ""} onChange={(e) => setF("department", e.target.value)} /></Field>
          <Field label="Locatie"><Input value={form.location ?? ""} onChange={(e) => setF("location", e.target.value)} /></Field>
          <Field label="Type">
            <select value={form.person_type ?? "Medewerker"} onChange={(e) => setF("person_type", e.target.value as Person["person_type"])} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              {PERSON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Dienstverband">
            <select value={form.employment_type ?? "Vast"} onChange={(e) => setF("employment_type", e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status ?? "Beschikbaar"} onChange={(e) => setF("status", e.target.value as PersonStatus)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              {PERSON_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Foto URL"><Input value={form.photo_url ?? ""} onChange={(e) => setF("photo_url", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Telefoon"><Input value={form.phone ?? ""} onChange={(e) => setF("phone", e.target.value)} /></Field>
          <Field label="E-mail"><Input value={form.email ?? ""} onChange={(e) => setF("email", e.target.value)} /></Field>
          <Field label="BEI bevoegdheid"><Input value={form.bei_authorization ?? ""} onChange={(e) => setF("bei_authorization", e.target.value)} placeholder="VP, VOP, WV…" /></Field>
          <Field label="Voertuig"><Input value={form.vehicle ?? ""} onChange={(e) => setF("vehicle", e.target.value)} /></Field>
          <Field label="Materieel"><Input value={form.equipment ?? ""} onChange={(e) => setF("equipment", e.target.value)} /></Field>
          <Field label="Projecten (komma's)" full>
            <Input value={(form.projects ?? []).join(", ")} onChange={(e) => setF("projects", splitCsv(e.target.value))} />
          </Field>
          <Field label="Certificaten (komma's)" full>
            <Input value={(form.certifications ?? []).join(", ")} onChange={(e) => setF("certifications", splitCsv(e.target.value))} />
          </Field>
          <Field label="Noodcontact" full>
            <Input value={form.emergency_contact ?? ""} onChange={(e) => setF("emergency_contact", e.target.value)} placeholder="Naam — telefoonnummer" />
          </Field>
          <Field label="" full>
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input type="checkbox" checked={form.emergency_admin_only ?? true} onChange={(e) => setF("emergency_admin_only", e.target.checked)} />
              Noodcontact alleen zichtbaar voor admins
            </label>
          </Field>
          <Field label="Notities" full>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setF("notes", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {person ? (
            <Button variant="ghost" onClick={del} className="text-rose-600 gap-2">
              <Trash2 className="h-4 w-4" /> Archiveren
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuleren</Button>
            <Button onClick={save}>Opslaan</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      {label && <div className="mb-1 text-xs font-medium text-foreground/70">{label}</div>}
      {children}
    </div>
  );
}

function splitCsv(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
