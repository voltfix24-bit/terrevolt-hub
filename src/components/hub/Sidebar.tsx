import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  AppWindow,
  Newspaper,
  BookOpen,
  FileText,
  ExternalLink,
  Settings,
} from "lucide-react";

const items = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Applicaties", to: "/applicaties", icon: AppWindow },
  { label: "Nieuws", to: "/nieuws", icon: Newspaper },
  { label: "Kennisbank", to: "/kennisbank", icon: BookOpen },
  { label: "Documenten", to: "/documenten", icon: FileText },
  { label: "Partnerportalen", to: "/partnerportalen", icon: ExternalLink },
  { label: "Instellingen", to: "/instellingen", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold">
          T
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-navy">TerreVolt</div>
          <div className="text-xs text-muted-foreground">Hub</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl bg-gradient-to-br from-pastel to-lime-soft p-4">
        <div className="text-sm font-semibold text-navy">Hulp nodig?</div>
        <p className="mt-1 text-xs text-navy/70">
          Bekijk de kennisbank of neem contact op met IT.
        </p>
      </div>
    </aside>
  );
}
