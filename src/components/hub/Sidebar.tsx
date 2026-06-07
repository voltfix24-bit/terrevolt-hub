import { Link, useRouterState } from "@tanstack/react-router";
import logo from "@/assets/terrevolt-logo.png.asset.json";
import {
  LayoutDashboard,
  AppWindow,
  Newspaper,
  BookOpen,
  FileText,
  ExternalLink,
  Cloud,
  Settings,
  Sparkles,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePerms, type Perms } from "@/lib/auth";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  show?: (p: Perms) => boolean;
};

const items: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Vraagbaak", to: "/vraagbaak", icon: Sparkles },
  { label: "Applicaties", to: "/applicaties", icon: AppWindow },
  { label: "Nieuws", to: "/nieuws", icon: Newspaper },
  { label: "Kennisbank", to: "/kennisbank", icon: BookOpen },
  {
    label: "Finance Wiki",
    to: "/finance-wiki",
    icon: Wallet,
    show: (p) => p.canViewFinance,
  },
  { label: "Smoelenboek", to: "/smoelenboek", icon: Users },
  { label: "SharePoint", to: "/sharepoint", icon: Cloud },
  { label: "Documenten", to: "/documenten", icon: FileText },
  { label: "Partnerportalen", to: "/partnerportalen", icon: ExternalLink },
  {
    label: "Instellingen",
    to: "/instellingen",
    icon: Settings,
    show: (p) => p.isAdmin,
  },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const perms = usePerms();
  const visible = items.filter((i) => !i.show || i.show(perms));
  return (
    <>
      <div className="flex items-center gap-2 px-6 py-6">
        <img src={logo.url} alt="TerreVolt" className="h-9 w-9 object-contain" />
        <div className="leading-tight">
          <div className="font-semibold text-navy">TerreVolt</div>
          <div className="text-xs text-muted-foreground">Intranet</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {visible.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
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
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
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
        className="flex w-72 max-w-[85vw] flex-col bg-sidebar p-0"
      >
        <NavContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
