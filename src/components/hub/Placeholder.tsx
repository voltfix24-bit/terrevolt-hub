import { Icon } from "./Icon";

export function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-navy">
          <Icon name="sparkles" size={22} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {description ?? "Deze sectie is binnenkort beschikbaar in TerreVolt Hub."}
        </p>
      </div>
    </div>
  );
}
