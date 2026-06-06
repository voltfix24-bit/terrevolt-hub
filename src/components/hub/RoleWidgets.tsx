import { useSession, useCurrentRole } from "@/lib/auth";
import type { AppRole } from "@/lib/userRoles";
import { Icon } from "@/components/hub/Icon";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";

type WidgetRole = "Directeur" | "Werkvoorbereider" | "Monteur" | "Administratie";

function mapAppRole(role: AppRole | undefined): WidgetRole {
  switch (role) {
    case "admin":
      return "Directeur";
    case "management":
      return "Administratie";
    case "monteur":
    case "zzper":
      return "Monteur";
    case "kantoor":
    default:
      return "Werkvoorbereider";
  }
}

type Trend = "up" | "down" | "flat";

type Stat = {
  label: string;
  value: string;
  delta?: string;
  trend?: Trend;
  hint?: string;
};

type ListItem = {
  title: string;
  meta: string;
  badge?: string;
  badgeTone?: "brand" | "warn" | "muted";
};

type Widget =
  | {
      kind: "stats";
      id: string;
      icon: string;
      title: string;
      description: string;
      href?: string;
      stats: Stat[];
    }
  | {
      kind: "list";
      id: string;
      icon: string;
      title: string;
      description: string;
      href?: string;
      items: ListItem[];
    }
  | {
      kind: "progress";
      id: string;
      icon: string;
      title: string;
      description: string;
      href?: string;
      bars: { label: string; value: number; total: number; tone?: "brand" | "warn" | "lime" }[];
    };

const WIDGETS: Record<Role, Widget[]> = {
  Directeur: [
    {
      kind: "stats",
      id: "omzet",
      icon: "trending-up",
      title: "Omzet",
      description: "Lopend kwartaal",
      href: "/applicaties",
      stats: [
        { label: "Dit kwartaal", value: "€ 1.84M", delta: "+12,4%", trend: "up" },
        { label: "Maand", value: "€ 612K", delta: "+4,1%", trend: "up" },
        { label: "Marge", value: "21,8%", delta: "−0,6%", trend: "down" },
      ],
    },
    {
      kind: "list",
      id: "facturen",
      icon: "file-text",
      title: "Openstaande facturen",
      description: "Te ontvangen bedragen",
      href: "/applicaties",
      items: [
        { title: "Liander — sleufwerk Q2", meta: "€ 184.500 · 14 dgn over termijn", badge: "Verlopen", badgeTone: "warn" },
        { title: "Van Gelder — aansluiting MS", meta: "€ 62.300 · vervalt 12 jun", badge: "Open", badgeTone: "brand" },
        { title: "Hanab — kabelmoffen", meta: "€ 24.900 · vervalt 22 jun", badge: "Open", badgeTone: "brand" },
        { title: "JR Infra — meterkasten", meta: "€ 9.450 · vervalt 28 jun", badge: "Open", badgeTone: "muted" },
      ],
    },
    {
      kind: "progress",
      id: "projecten",
      icon: "layout-dashboard",
      title: "Projectstatus",
      description: "Voortgang lopende projecten",
      href: "/applicaties",
      bars: [
        { label: "Stadshart Eindhoven", value: 78, total: 100, tone: "brand" },
        { label: "Renovatie Almere-Oost", value: 54, total: 100, tone: "lime" },
        { label: "MS-station Zaandam", value: 32, total: 100, tone: "warn" },
        { label: "Bedrijventerrein Drachten", value: 12, total: 100, tone: "brand" },
      ],
    },
  ],
  Werkvoorbereider: [
    {
      kind: "list",
      id: "werkplannen",
      icon: "clipboard-list",
      title: "Werkplannen",
      description: "Plannen klaar voor uitgifte",
      href: "/kennisbank/werkvoorbereiding",
      items: [
        { title: "WP-2026-118 · Liander Eindhoven", meta: "Concept · 4 taken open", badge: "Concept", badgeTone: "muted" },
        { title: "WP-2026-119 · Van Gelder Almere", meta: "Klaar voor review", badge: "Review", badgeTone: "brand" },
        { title: "WP-2026-120 · Hanab Zaandam", meta: "Uitgifte gepland 6 jun", badge: "Gepland", badgeTone: "brand" },
        { title: "WP-2026-121 · JR Infra Drachten", meta: "Wacht op tekening", badge: "Wachten", badgeTone: "warn" },
      ],
    },
    {
      kind: "stats",
      id: "goedkeuringen",
      icon: "check-circle",
      title: "Goedkeuringen",
      description: "Wachten op jouw beoordeling",
      href: "/applicaties",
      stats: [
        { label: "Open", value: "7", hint: "3 urgent" },
        { label: "Vandaag behandeld", value: "4", delta: "+2", trend: "up" },
        { label: "Gem. doorlooptijd", value: "1,2 dag", delta: "−0,3 dag", trend: "up" },
      ],
    },
    {
      kind: "list",
      id: "acties",
      icon: "list-checks",
      title: "Open acties",
      description: "Toegewezen aan jou",
      items: [
        { title: "Materiaalstaat WP-118 aanvullen", meta: "Vandaag · WP-2026-118" },
        { title: "BEI check ploeg 3 plannen", meta: "Morgen · Veiligheid" },
        { title: "Tekening 04-B retour aan klant", meta: "5 jun · Van Gelder" },
        { title: "RI&E update Drachten afronden", meta: "8 jun · WP-2026-121" },
      ],
    },
  ],
  Monteur: [
    {
      kind: "list",
      id: "planner",
      icon: "calendar-days",
      title: "Planner",
      description: "Jouw werk deze week",
      href: "/applicaties",
      items: [
        { title: "Ma · Sleufwerk Vestdijk Eindhoven", meta: "Ploeg 2 · 07:00 – 16:00", badge: "Vandaag", badgeTone: "brand" },
        { title: "Di · Aansluiting MS-kast Almere", meta: "Ploeg 2 · 07:30 – 15:30" },
        { title: "Wo · Kabel trekken Zaandam", meta: "Ploeg 2 · 07:00 – 17:00" },
        { title: "Do · Aardingsmeting Drachten", meta: "Ploeg 2 · 08:00 – 14:00" },
      ],
    },
    {
      kind: "stats",
      id: "uren",
      icon: "clock",
      title: "Urenregistratie",
      description: "Deze week",
      href: "/applicaties",
      stats: [
        { label: "Geboekt", value: "28,5 u", hint: "van 40 u" },
        { label: "Overuren", value: "2,0 u" },
        { label: "Nog te boeken", value: "11,5 u", delta: "Do + Vr", trend: "flat" },
      ],
    },
    {
      kind: "list",
      id: "documenten",
      icon: "folder",
      title: "Documenten",
      description: "Voor jouw lopende werk",
      href: "/sharepoint",
      items: [
        { title: "Werkinstructie aansluiting MS-kast", meta: "PDF · WP-2026-119" },
        { title: "Tekening 04-B Vestdijk", meta: "DWG · WP-2026-118" },
        { title: "BEI persoonscertificaat", meta: "PDF · geldig t/m 03-2027" },
        { title: "Materiaalstaat Drachten", meta: "XLSX · WP-2026-121" },
      ],
    },
  ],
  Administratie: [
    {
      kind: "list",
      id: "facturen",
      icon: "file-text",
      title: "Facturen",
      description: "Te verwerken",
      items: [
        { title: "Inkoop · TKF Kabel BV", meta: "€ 18.420 · vervalt 10 jun", badge: "Open", badgeTone: "brand" },
        { title: "Verkoop · Liander Q2 termijn", meta: "€ 184.500 · 14 dgn over", badge: "Verlopen", badgeTone: "warn" },
        { title: "Inkoop · Boels verhuur", meta: "€ 3.240 · vervalt 18 jun", badge: "Open", badgeTone: "brand" },
        { title: "Inkoop · Brandstof BP", meta: "€ 1.860 · betaald", badge: "Afgerond", badgeTone: "muted" },
      ],
    },
    {
      kind: "list",
      id: "contracten",
      icon: "file-signature",
      title: "Contracten",
      description: "Aflopend of in onderhandeling",
      items: [
        { title: "Raamovereenkomst Liander", meta: "Verlengen vóór 1 okt 2026", badge: "Actie", badgeTone: "warn" },
        { title: "SLA Van Gelder", meta: "Loopt t/m 31 dec 2027", badge: "Actief", badgeTone: "brand" },
        { title: "Inhuur ZZP · Pieter de Vries", meta: "Eindigt 30 jun 2026", badge: "Actie", badgeTone: "warn" },
        { title: "Leasecontract Mercedes Vito (3)", meta: "Loopt t/m 2028", badge: "Actief", badgeTone: "brand" },
      ],
    },
    {
      kind: "stats",
      id: "personeel",
      icon: "users",
      title: "Personeelsdossiers",
      description: "Status en attentiepunten",
      stats: [
        { label: "Medewerkers", value: "84" },
        { label: "Aflopende certificaten", value: "6", delta: "≤ 60 dgn", trend: "down" },
        { label: "Open verlofaanvragen", value: "9" },
      ],
    },
  ],
};

function toneBg(tone?: "brand" | "warn" | "muted") {
  switch (tone) {
    case "warn":
      return "bg-amber-100 text-amber-800";
    case "muted":
      return "bg-muted text-muted-foreground";
    case "brand":
    default:
      return "bg-brand/15 text-brand";
  }
}

function barBg(tone?: "brand" | "warn" | "lime") {
  switch (tone) {
    case "warn":
      return "bg-amber-400";
    case "lime":
      return "bg-lime-soft";
    case "brand":
    default:
      return "bg-brand";
  }
}

function TrendIcon({ trend }: { trend?: Trend }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-brand" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-amber-600" />;
  return null;
}

function WidgetShell({
  icon,
  title,
  description,
  href,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
            <Icon name={icon} size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-navy">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {href && (
          <a
            href={href}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Openen <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {children}
    </article>
  );
}

export function RoleWidgets() {
  const role = useHubStore((s) => s.role);
  const widgets = WIDGETS[role] ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w) => (
        <WidgetShell
          key={w.id}
          icon={w.icon}
          title={w.title}
          description={w.description}
          href={w.href}
        >
          {w.kind === "stats" && (
            <div className="grid grid-cols-3 gap-3">
              {w.stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-accent/50 p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-lg font-semibold text-navy">{s.value}</div>
                  {(s.delta || s.hint) && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70">
                      <TrendIcon trend={s.trend} />
                      {s.delta ?? s.hint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {w.kind === "list" && (
            <ul className="divide-y divide-border">
              {w.items.map((it, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-navy">{it.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{it.meta}</div>
                  </div>
                  {it.badge && (
                    <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " + toneBg(it.badgeTone)}>
                      {it.badge}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {w.kind === "progress" && (
            <div className="space-y-3">
              {w.bars.map((b) => {
                const pct = Math.round((b.value / b.total) * 100);
                return (
                  <div key={b.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-navy">{b.label}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={"h-full rounded-full " + barBg(b.tone)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetShell>
      ))}
    </div>
  );
}
