import { Icon } from "./Icon";

// Curated set, kept consistent in tone (outline / rounded vibe).
export const ICON_CHOICES = [
  "layout-dashboard", "calendar-days", "clock", "timer", "zap", "wrench",
  "cable", "plug", "folder", "folder-open", "file-text", "files",
  "book-open", "book-marked", "graduation-cap", "clipboard-list", "clipboard-check",
  "shield-check", "shield", "hard-hat", "globe", "map", "map-pin",
  "ruler", "compass", "settings", "sliders-horizontal", "package",
  "truck", "factory", "building-2", "users", "user", "id-card",
  "mail", "message-square", "phone", "video", "home", "newspaper",
  "bell", "search", "link", "external-link", "bookmark", "star",
  "sparkles", "circle", "square", "triangle-alert", "info", "lightbulb",
  "battery-charging", "activity", "bar-chart-3", "pie-chart", "database",
];

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-navy">
          <Icon name={value} size={22} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="lucide-naam (bv. calendar-days)"
          className="flex-1 rounded-xl border border-border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>
      <div className="grid max-h-56 grid-cols-10 gap-1.5 overflow-y-auto rounded-xl border border-border bg-background/50 p-2">
        {ICON_CHOICES.map((n) => {
          const active = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={n}
              className={[
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground",
              ].join(" ")}
            >
              <Icon name={n} size={18} />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: elke Lucide-iconnaam werkt (kebab-case), bv. <code>shield-check</code>.
      </p>
    </div>
  );
}
