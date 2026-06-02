import { ArrowUpRight } from "lucide-react";
import type { Application } from "@/lib/applications";
import { Icon } from "./Icon";

const accentMap: Record<Application["accent"], string> = {
  brand: "from-brand/15 to-pastel/30",
  pastel: "from-pastel/40 to-lime-soft/40",
  lime: "from-lime-soft/60 to-lime-accent/60",
  navy: "from-navy/90 to-navy text-white",
};

function CardInner({ app, large }: { app: Application; large?: boolean }) {
  const isDark = app.accent === "navy";
  return (
    <div
      className={[
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border bg-gradient-to-br p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        accentMap[app.accent],
        large ? "min-h-[220px]" : "min-h-[160px]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div
          className={[
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            isDark ? "bg-white/10 text-white" : "bg-white/70 text-navy backdrop-blur",
          ].join(" ")}
        >
          <Icon name={app.icon} size={22} />
        </div>
        <ArrowUpRight
          className={[
            "h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            isDark ? "text-white/70" : "text-foreground/50",
          ].join(" ")}
        />
      </div>
      <div className="mt-6">
        <h3
          className={[
            large ? "text-2xl" : "text-lg",
            "font-semibold tracking-tight",
            isDark ? "text-white" : "text-navy",
          ].join(" ")}
        >
          {app.name}
        </h3>
        <p
          className={[
            "mt-1 text-sm",
            isDark ? "text-white/70" : "text-foreground/70",
          ].join(" ")}
        >
          {app.description}
        </p>
      </div>
    </div>
  );
}

export function AppCard({ app, large }: { app: Application; large?: boolean }) {
  const isExternal = /^https?:\/\//i.test(app.url);
  const extra = app.new_tab || isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a href={app.url} {...extra} className="block h-full">
      <CardInner app={app} large={large} />
    </a>
  );
}
