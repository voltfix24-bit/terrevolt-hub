import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { IconPicker } from "./IconPicker";

export type Field =
  | { key: string; label: string; type: "text" | "url" | "date" }
  | { key: string; label: string; type: "textarea" }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "bool" }
  | { key: string; label: string; type: "image" }
  | { key: string; label: string; type: "icon" };

type Row = Record<string, unknown> & { id: string };

export function EntityManager<T extends Row>({
  title,
  description,
  items,
  fields,
  emptyItem,
  rowPreview,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  title: string;
  description?: string;
  items: T[];
  fields: Field[];
  emptyItem: Omit<T, "id">;
  rowPreview: (item: T) => ReactNode;
  onAdd: (item: Omit<T, "id">) => void;
  onUpdate: (id: string, patch: Partial<T>) => void;
  onDelete: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [adding, setAdding] = useState(false);

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setDraft({ ...emptyItem });
  };
  const startEdit = (item: T) => {
    setAdding(false);
    setEditingId(item.id);
    setDraft({ ...item });
  };
  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(null);
  };
  const save = () => {
    if (!draft) return;
    if (adding) onAdd(draft as Omit<T, "id">);
    else if (editingId) onUpdate(editingId, draft as Partial<T>);
    cancel();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-navy">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Toevoegen
        </button>
      </div>

      {adding && draft && (
        <EditorCard fields={fields} draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />
      )}

      <div className="space-y-2">
        {items.length === 0 && !adding && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nog geen items. Klik op "Toevoegen" om te beginnen.
          </div>
        )}
        {items.map((item, idx) => {
          const isEditing = editingId === item.id;
          if (isEditing && draft) {
            return (
              <EditorCard
                key={item.id}
                fields={fields}
                draft={draft}
                setDraft={setDraft}
                onSave={save}
                onCancel={cancel}
              />
            );
          }
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  aria-label="Omhoog"
                  disabled={idx === 0}
                  onClick={() => onReorder(idx, idx - 1)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Omlaag"
                  disabled={idx === items.length - 1}
                  onClick={() => onReorder(idx, idx + 1)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">{rowPreview(item)}</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(item)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Bewerken"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Item verwijderen?")) onDelete(item.id);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditorCard({
  fields,
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  fields: Field[];
  draft: Record<string, unknown>;
  setDraft: (d: Record<string, unknown>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (key: string, value: unknown) => setDraft({ ...draft, [key]: value });

  return (
    <div className="rounded-2xl border border-brand/40 bg-card p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((f) => {
          const v = draft[f.key];
          if (f.type === "textarea") {
            return (
              <label key={f.key} className="md:col-span-2 text-sm">
                <span className="mb-1 block font-medium text-foreground/80">{f.label}</span>
                <textarea
                  rows={3}
                  value={(v as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                />
              </label>
            );
          }
          if (f.type === "select") {
            return (
              <label key={f.key} className="text-sm">
                <span className="mb-1 block font-medium text-foreground/80">{f.label}</span>
                <select
                  value={(v as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            );
          }
          if (f.type === "bool") {
            return (
              <label key={f.key} className="flex items-center gap-3 text-sm md:col-span-1">
                <input
                  type="checkbox"
                  checked={Boolean(v)}
                  onChange={(e) => set(f.key, e.target.checked)}
                  className="h-4 w-4 accent-[color:var(--brand)]"
                />
                <span className="font-medium text-foreground/80">{f.label}</span>
              </label>
            );
          }
          if (f.type === "icon") {
            return (
              <div key={f.key} className="md:col-span-2 text-sm">
                <span className="mb-1 block font-medium text-foreground/80">{f.label}</span>
                <IconPicker value={(v as string) ?? ""} onChange={(name) => set(f.key, name)} />
              </div>
            );
          }
          if (f.type === "image") {
            return (
              <label key={f.key} className="md:col-span-2 text-sm">
                <span className="mb-1 block font-medium text-foreground/80">{f.label}</span>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="URL of upload hieronder"
                    value={(v as string) ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => set(f.key, reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                    className="text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy hover:file:opacity-80"
                  />
                  {typeof v === "string" && v && (
                    <img src={v} alt="" className="h-24 w-40 rounded-lg object-cover" />
                  )}
                </div>
              </label>
            );
          }
          return (
            <label key={f.key} className="text-sm">
              <span className="mb-1 block font-medium text-foreground/80">{f.label}</span>
              <input
                type={f.type === "date" ? "text" : f.type}
                value={(v as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
              />
            </label>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent"
        >
          <X className="h-4 w-4" /> Annuleren
        </button>
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          <Check className="h-4 w-4" /> Opslaan
        </button>
      </div>
    </div>
  );
}
