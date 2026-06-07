import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { Icon } from "@/components/hub/Icon";
import { IconPicker } from "@/components/hub/IconPicker";
import {
  useSharePointConfig,
  useUpdateSharePointConfig,
  useSharePointItems,
  useSharePointMutations,
  type SharePointItem,
  type SharePointKind,
} from "@/lib/sharepoint";
import { logAudit } from "@/lib/audit";
import { ArrowUpRight, ExternalLink, Folder, Link2, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/sharepoint")({
  head: () => ({
    meta: [
      { title: "SharePoint — TerreVolt Intranet" },
      { name: "description", content: "Centrale SharePoint integratie: quick links en favoriete mappen." },
    ],
  }),
  component: SharePointPage,
});

function SharePointPage() {
  const { data: config } = useSharePointConfig();
  const updateConfig = useUpdateSharePointConfig();
  const { data: items = [] } = useSharePointItems();
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const current = baseUrl ?? config?.base_url ?? "";

  const links = items.filter((i) => i.kind === "link");
  const folders = items.filter((i) => i.kind === "folder");

  return (
    <HubLayout>
      <div className="mx-auto max-w-6xl space-y-10">
        <SectionHeader
          title="SharePoint integratie"
          subtitle="Beheer de centrale SharePoint URL, quick links en veelgebruikte mappen. Bestanden blijven in SharePoint — niets wordt lokaal opgeslagen."
        />

        {/* Base URL */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
              <Icon name="globe" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-navy">SharePoint omgeving</h2>
              <p className="text-sm text-muted-foreground">Basis-URL van de TerreVolt SharePoint tenant.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              placeholder="https://terrevolt.sharepoint.com"
              value={current}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
            <button
              onClick={() => {
                updateConfig.mutate(current, { onSuccess: () => setBaseUrl(null) });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50"
              disabled={updateConfig.isPending}
            >
              <Save className="h-4 w-4" /> Opslaan
            </button>
            {current && (
              <a
                href={current}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Openen <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </section>

        <ItemSection
          kind="link"
          title="Quick links"
          subtitle="Veelgebruikte SharePoint sites en pagina's."
          items={links}
        />
        <ItemSection
          kind="folder"
          title="Veelgebruikte mappen"
          subtitle="Snelle toegang tot belangrijke documentmappen."
          items={folders}
        />
      </div>
    </HubLayout>
  );
}

function ItemSection({
  kind,
  title,
  subtitle,
  items,
}: {
  kind: SharePointKind;
  title: string;
  subtitle: string;
  items: SharePointItem[];
}) {
  const { add, update, remove, touch } = useSharePointMutations();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const emptyDraft = {
    kind,
    name: "",
    description: "",
    url: "",
    icon: kind === "folder" ? "folder" : "link",
    favorite: false,
  };

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <SectionHeader title={title} subtitle={subtitle} />
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Toevoegen
        </button>
      </div>

      {adding && (
        <ItemForm
          initial={emptyDraft}
          submitLabel="Toevoegen"
          onCancel={() => setAdding(false)}
          onSubmit={(values) =>
            add.mutate(values, { onSuccess: () => setAdding(false) })
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) =>
          editing === item.id ? (
            <div key={item.id} className="sm:col-span-2 lg:col-span-3">
              <ItemForm
                initial={item}
                submitLabel="Opslaan"
                onCancel={() => setEditing(null)}
                onSubmit={(values) =>
                  update.mutate(
                    { id: item.id, patch: values },
                    { onSuccess: () => setEditing(null) },
                  )
                }
              />
            </div>
          ) : (
            <article
              key={item.id}
              className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
                  <Icon name={item.icon} size={20} />
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() =>
                      update.mutate({ id: item.id, patch: { favorite: !item.favorite } })
                    }
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-navy"
                    title="Favoriet"
                  >
                    <Star className={"h-4 w-4 " + (item.favorite ? "fill-brand text-brand" : "")} />
                  </button>
                  <button
                    onClick={() => setEditing(item.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-navy"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${item.name}" verwijderen?`)) remove.mutate(item.id);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-navy">{item.name}</h3>
                  {item.favorite && <Star className="h-3.5 w-3.5 fill-brand text-brand" />}
                </div>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  touch.mutate(item.id);
                  void logAudit("document.open", { targetType: "sharepoint_item", targetId: item.id, metadata: { name: item.name } });
                }}
                className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                Openen in SharePoint <ArrowUpRight className="h-4 w-4" />
              </a>
            </article>
          ),
        )}
        {items.length === 0 && !adding && (
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nog niets toegevoegd.
          </div>
        )}
      </div>
    </section>
  );
}

type DraftValues = {
  kind: SharePointKind;
  name: string;
  description: string;
  url: string;
  icon: string;
  favorite: boolean;
};

function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: DraftValues;
  submitLabel: string;
  onSubmit: (values: DraftValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<DraftValues>({
    kind: initial.kind,
    name: initial.name,
    description: initial.description,
    url: initial.url,
    icon: initial.icon,
    favorite: initial.favorite,
  });

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Naam">
          <input
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder={values.kind === "folder" ? "Projectdossiers" : "HR Portaal"}
          />
        </Labeled>
        <Labeled label="SharePoint URL">
          <input
            type="url"
            value={values.url}
            onChange={(e) => setValues({ ...values, url: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="https://terrevolt.sharepoint.com/sites/..."
          />
        </Labeled>
        <Labeled label="Beschrijving" className="sm:col-span-2">
          <input
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </Labeled>
        <Labeled label="Icoon">
          <IconPicker value={values.icon} onChange={(icon) => setValues({ ...values, icon })} />
        </Labeled>
        <Labeled label="Favoriet">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.favorite}
              onChange={(e) => setValues({ ...values, favorite: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-brand"
            />
            Tonen op homepage
          </label>
        </Labeled>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent"
        >
          <X className="h-4 w-4" /> Annuleren
        </button>
        <button
          onClick={() => {
            if (!values.name || !values.url) return;
            onSubmit(values);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          {values.kind === "folder" ? <Folder className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {submitLabel}
        </button>
      </div>
    </div>
  );
}

function Labeled({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + (className ?? "")}>
      <span className="mb-1.5 block text-xs font-medium text-foreground/70">{label}</span>
      {children}
    </label>
  );
}
