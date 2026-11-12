import { ArrowUpRight } from "lucide-react";
import type { Application } from "@/lib/applications";
import { Icon } from "./Icon";

const tileMap: Record<Application["accent"], string> = {
  brand: "bg-brand/15 text-navy",
  pastel: "bg-pastel/50 text-navy",
  lime: "bg-lime-soft/70 text-navy",
  navy: "bg-navy text-brand-foreground",
};

export function AppCard({ app, compact }: { app: Application; large?: boolean; compact?: boolean }) {
  const isExternal = /^https?:\/\//i.test(app.url);
  const extra = app.new_tab || isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a
      href={app.url}
      {...extra}
      className="group flex h-full min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-brand/50 sm:p-4"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tileMap[app.accent]}`}>
        <Icon name={app.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 break-words font-semibold leading-snug text-navy">{app.name}</h3>
          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
        </div>
        {!compact && app.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-foreground/70">{app.description}</p>
        )}
        {!compact && app.category && (
          <div className="mt-1.5 text-xs text-muted-foreground">{app.category}</div>
        )}
      </div>
    </a>
  );
}
