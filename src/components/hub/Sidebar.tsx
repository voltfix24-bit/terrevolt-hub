import { Link, useRouterState } from "@tanstack/react-router";
import logo from "@/assets/terrevolt-logo.png.asset.json";
import {
  Home,
  AppWindow,
  Newspaper,
  BookOpen,
  FileText,
  ExternalLink,
  Cloud,
  Settings,
  Search,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePerms, type Perms } from "@/lib/auth";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  show?: (p: Perms) => boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Start",
    items: [
      { label: "Startpagina", to: "/", icon: Home },
      { label: "Vraagbaak", to: "/vraagbaak", icon: Search },
      { label: "Nieuws", to: "/nieuws", icon: Newspaper },
    ],
  },
  {
    label: "Werkplek",
    items: [
      { label: "Applicaties", to: "/applicaties", icon: AppWindow },
      { label: "Partnerportalen", to: "/partnerportalen", icon: ExternalLink },
    ],
  },
  {
    label: "Informatie",
    items: [
      { label: "Kennisbank", to: "/kennisbank", icon: BookOpen },
      { label: "Documenten", to: "/documenten", icon: FileText },
      { label: "SharePoint", to: "/sharepoint", icon: Cloud },
      { label: "Finance", to: "/finance-wiki", icon: Wallet, show: (p) => p.canViewFinance },
    ],
  },
  {
    label: "Organisatie",
    items: [{ label: "Collega's", to: "/smoelenboek", icon: Users }],
  },
  {
    label: "Beheer",
    items: [
      {
        label: "Instellingen",
        to: "/instellingen",
        icon: Settings,
        show: (p) =>
          p.isAdmin || p.hasPermission("manage_settings") || p.hasPermission("manage_users"),
      },
    ],
  },
];

/** Active when the path equals the item or is one of its sub-pages. */
export function isNavActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const perms = usePerms();
  return (
    <>
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-5">
        <img src={logo.url} alt="" className="h-8 w-8 shrink-0 object-contain" />
        <div className="min-w-0 leading-tight">
          <div className="font-semibold text-navy">TerreVolt</div>
          <div className="text-xs text-muted-foreground">Intranet</div>
        </div>
      </Link>

      <nav
        aria-label="Hoofdmenu"
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-6"
      >
        {groups.map((g) => {
          const visible = g.items.filter((i) => !i.show || i.show(perms));
          if (visible.length === 0) return null;
          return (
            <div key={g.label}>
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </div>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active = isNavActive(pathname, item.to);
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={[
                          "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-navy text-brand-foreground"
                            : "text-foreground/75 hover:bg-secondary hover:text-foreground",
                        ].join(" ")}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-pastel" : ""}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4 pb-safe text-xs text-muted-foreground">
        Iets niet gevonden?{" "}
        <Link
          to="/vraagbaak"
          onClick={onNavigate}
          className="font-medium text-navy underline-offset-2 hover:underline"
        >
          Vraag het de Vraagbaak
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <NavContent />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex h-dvh w-72 max-w-[85vw] flex-col gap-0 bg-sidebar p-0"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <NavContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
