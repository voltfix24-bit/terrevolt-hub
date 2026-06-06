import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { usePerson, usePersonSensitive } from "@/lib/people";
import { useSession, useCurrentRole } from "@/lib/auth";
import { Avatar, StatusBadge, QuickActions } from "./smoelenboek";
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, Car, Wrench, ShieldAlert, ShieldCheck, FileBadge2, StickyNote } from "lucide-react";

export const Route = createFileRoute("/smoelenboek/$id")({
  head: () => ({
    meta: [{ title: "Profiel — Smoelenboek" }],
  }),
  component: PersonDetail,
});

function PersonDetail() {
  const { id } = useParams({ from: "/smoelenboek/$id" });
  const { data: person, isLoading } = usePerson(id);
  const { user } = useSession();
  const { data: roleRow } = useCurrentRole(user);
  const isStaff = roleRow?.role === "admin" || roleRow?.role === "management";
  const { data: sensitive } = usePersonSensitive(isStaff ? id : undefined);

  if (isLoading) {
    return <HubLayout><div className="mx-auto max-w-4xl text-sm text-muted-foreground">Laden…</div></HubLayout>;
  }
  if (!person) {
    return (
      <HubLayout>
        <div className="mx-auto max-w-4xl">
          <Link to="/smoelenboek" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
            <ArrowLeft className="h-4 w-4" /> Terug
          </Link>
          <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Profiel niet gevonden.
          </div>
        </div>
      </HubLayout>
    );
  }

  const hidden = new Set(person.hidden_fields);
  const emergency = sensitive?.emergency_contact ?? "";
  const showEmergency = isStaff && emergency.length > 0;

  return (
    <HubLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/smoelenboek" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> Smoelenboek
        </Link>

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-pastel/30 p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime-soft/50 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar person={person} size={104} />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-navy">{person.full_name}</h1>
              <p className="mt-1 text-foreground/70">
                {person.job_title || person.person_type}
                {person.department && ` · ${person.department}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={person.status} />
                <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
                  {person.person_type}
                </span>
                <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
                  {person.employment_type}
                </span>
              </div>
            </div>
            <QuickActions person={person} />
          </div>
        </div>

        {/* Contact + work */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InfoCard title="Contact" icon={<Phone className="h-4 w-4" />}>
            {!hidden.has("phone") && person.phone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefoon" value={<a href={`tel:${person.phone}`} className="text-brand hover:underline">{person.phone}</a>} />}
            {!hidden.has("email") && person.email && <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-mail" value={<a href={`mailto:${person.email}`} className="text-brand hover:underline">{person.email}</a>} />}
            {person.location && <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Locatie" value={person.location} />}
          </InfoCard>

          <InfoCard title="Werk" icon={<Briefcase className="h-4 w-4" />}>
            <InfoRow label="Afdeling" value={person.department || "—"} />
            <InfoRow label="Type" value={person.person_type} />
            <InfoRow label="Dienstverband" value={person.employment_type} />
          </InfoCard>

          {person.projects.length > 0 && (
            <InfoCard title="Toegewezen projecten" icon={<Briefcase className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {person.projects.map((pr) => (
                  <span key={pr} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-navy">{pr}</span>
                ))}
              </div>
            </InfoCard>
          )}

          {(person.certifications.length > 0 || person.bei_authorization) && (
            <InfoCard title="Certificaten & bevoegdheden" icon={<ShieldCheck className="h-4 w-4" />}>
              {person.bei_authorization && (
                <InfoRow icon={<FileBadge2 className="h-3.5 w-3.5" />} label="BEI" value={person.bei_authorization} />
              )}
              {person.certifications.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {person.certifications.map((c) => (
                    <span key={c} className="rounded-full bg-lime-soft px-3 py-1 text-xs font-medium text-navy">{c}</span>
                  ))}
                </div>
              )}
            </InfoCard>
          )}

          {(person.vehicle || person.equipment) && (
            <InfoCard title="Voertuig & materieel" icon={<Car className="h-4 w-4" />}>
              {person.vehicle && <InfoRow icon={<Car className="h-3.5 w-3.5" />} label="Voertuig" value={person.vehicle} />}
              {person.equipment && <InfoRow icon={<Wrench className="h-3.5 w-3.5" />} label="Materieel" value={person.equipment} />}
            </InfoCard>
          )}

          {showEmergency && (
            <InfoCard title="Noodcontact" icon={<ShieldAlert className="h-4 w-4 text-rose-600" />}>
              <div className="text-sm text-foreground/80">{emergency}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">Alleen zichtbaar voor administratie / directie.</div>
            </InfoCard>
          )}

          {person.notes && (
            <InfoCard title="Notities" icon={<StickyNote className="h-4 w-4" />}>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{person.notes}</p>
            </InfoCard>
          )}
        </div>
      </div>
    </HubLayout>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
        <span className="text-brand">{icon}</span> {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="mt-0.5 w-24 shrink-0 text-xs text-muted-foreground flex items-center gap-1.5">
        {icon && <span className="text-foreground/50">{icon}</span>}
        {label}
      </div>
      <div className="min-w-0 flex-1 text-foreground/80">{value}</div>
    </div>
  );
}
