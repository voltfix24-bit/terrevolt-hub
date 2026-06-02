import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { EntityManager, type Field } from "@/components/hub/EntityManager";
import { useHubStore, type QuickLink } from "@/lib/hub-store";
import {
  usePartnerLinks,
  usePartnerLinkMutations,
  PARTNER_CATEGORIES,
  type PartnerLink,
  type PartnerLinkInput,
} from "@/lib/partners";
import {
  useDepartments,
  useDepartmentMutations,
  type Department,
  type DepartmentInput,
} from "@/lib/departments";
import {
  useUserRoles,
  useUserRoleMutations,
  APP_ROLES,
  roleLabel,
  type UserRole,
  type UserRoleInput,
} from "@/lib/userRoles";
import {
  useApplications,
  useAppMutations,
  APP_CATEGORIES,
  type Application,
  type ApplicationInput,
} from "@/lib/applications";
import {
  useNews,
  useNewsMutations,
  formatNewsDate,
  type NewsArticle,
  type NewsInput,
} from "@/lib/news";
import {
  useKbCategories,
  useKbCategoryMutations,
  useKbArticles,
  useKbArticleMutations,
  useKbSections,
  useKbSectionMutations,
  uploadKbDocument,
  slugify,
  emptyArticleInput,
  KB_STATUSES,
  KB_DOCUMENT_TYPES,
  statusLabel,
  documentTypeLabel,
  formatFileSize,
  type KbCategory,
  type KbCategoryInput,
  type KbSection,
  type KbSectionInput,
  type KbArticle,
  type KbArticleInput,
  type KbAttachment,
  type KbStatus,
  type KbDocumentType,
} from "@/lib/knowledge";
import { Icon } from "@/components/hub/Icon";
import { RotateCcw, Upload, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/instellingen")({
  head: () => ({ meta: [{ title: "Instellingen — TerreVolt Hub" }] }),
  component: SettingsPage,
});

const TABS = [
  { id: "apps", label: "Applicaties" },
  { id: "news", label: "Nieuws" },
  { id: "partners", label: "Partnerportalen" },
  { id: "quick", label: "Quick links" },
  { id: "departments", label: "Afdelingen" },
  { id: "roles", label: "Rollen" },
  { id: "kb-sections", label: "KB secties" },
  { id: "kb-cats", label: "KB sub-categorieën" },
  { id: "kb-articles", label: "KB kennisitems" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("apps");
  const store = useHubStore();

  return (
    <HubLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader title="Instellingen" subtitle="Beheer alle homepage-inhoud op één plek." />
          <button
            onClick={() => {
              if (confirm("Alle inhoud terugzetten naar de standaardwaarden?")) store.resetAll();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" /> Standaard herstellen
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "apps" && <AppsTab />}
        {tab === "news" && <NewsTab />}
        {tab === "partners" && <PartnersTab />}
        {tab === "quick" && <QuickLinksTab />}
        {tab === "departments" && <DepartmentsTab />}
        {tab === "roles" && <RolesTab />}
        {tab === "kb-sections" && <KbSectionsTab />}
        {tab === "kb-cats" && <KbCategoriesTab />}
        {tab === "kb-articles" && <KbArticlesTab />}
      </div>
    </HubLayout>
  );
}

/* ---------------- Knowledge sections ---------------- */
function KbSectionsTab() {
  const { data: sections = [], isLoading } = useKbSections();
  const { add, update, remove } = useKbSectionMutations();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "slug", label: "Slug (URL-deel)", type: "text" },
    { key: "icon", label: "Icoon", type: "icon" },
    { key: "description", label: "Beschrijving", type: "textarea" },
  ];
  const empty: KbSectionInput = {
    name: "",
    slug: "",
    icon: "book-open",
    accent: "brand",
    description: "",
  };
  return (
    <>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<KbSection>
        title="Kennisbank hoofdsecties"
        description="De vijf hoofdsecties die de kennisbank structureren."
        items={sections}
        fields={fields}
        emptyItem={empty as Omit<KbSection, "id">}
        onAdd={(item) => {
          const i = item as KbSectionInput;
          add.mutate({ ...i, slug: i.slug || slugify(i.name) });
        }}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<KbSection> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={() => undefined}
        rowPreview={(s) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <Icon name={s.icon} size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-navy">{s.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                /{s.slug} · {s.description}
              </div>
            </div>
          </div>
        )}
      />
    </>
  );
}

/* ---------------- Apps ---------------- */
function AppsTab() {
  const { data: apps = [], isLoading } = useApplications();
  const { add, update, remove, reorder } = useAppMutations();

  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "icon", label: "Icoon", type: "icon" },
    { key: "description", label: "Beschrijving", type: "textarea" },
    {
      key: "category",
      label: "Categorie",
      type: "select",
      options: APP_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    { key: "url", label: "URL", type: "url" },
    {
      key: "accent",
      label: "Accentkleur",
      type: "select",
      options: [
        { value: "brand", label: "Groen" },
        { value: "pastel", label: "Pastel" },
        { value: "lime", label: "Lime" },
        { value: "navy", label: "Donker" },
      ],
    },
    { key: "featured", label: "Uitgelicht (grote kaart)", type: "bool" },
    { key: "new_tab", label: "Openen in nieuw tabblad", type: "bool" },
    { key: "active", label: "Actief (zichtbaar op homepage)", type: "bool" },
  ];

  const empty: ApplicationInput = {
    name: "",
    description: "",
    icon: "sparkles",
    category: "Overig",
    url: "/",
    new_tab: false,
    featured: false,
    active: true,
    accent: "brand",
  };

  return (
    <>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<Application>
        title="Applicaties"
        description="Tools die op het dashboard verschijnen. Uitgelichte apps krijgen een grote kaart."
        items={apps}
        fields={fields}
        emptyItem={empty as Omit<Application, "id">}
        onAdd={(item) => add.mutate(item as ApplicationInput)}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<Application> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={(from, to) => {
          if (from === to) return;
          const next = apps.slice();
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          reorder.mutate({ items: next });
        }}
        rowPreview={(a) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
              <Icon name={a.icon} size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate font-medium text-navy">{a.name}</div>
                {a.featured && (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                    Uitgelicht
                  </span>
                )}
                {!a.active && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Inactief
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {a.category} · {a.url}
              </div>
            </div>
          </div>
        )}
      />
    </>
  );
}

/* ---------------- News ---------------- */
function NewsTab() {
  const { data: news = [], isLoading } = useNews();
  const { add, update, remove, reorder } = useNewsMutations();
  const fields: Field[] = [
    { key: "title", label: "Titel", type: "text" },
    { key: "category", label: "Categorie", type: "text" },
    { key: "publish_date", label: "Publicatiedatum", type: "date" },
    { key: "author", label: "Auteur", type: "text" },
    { key: "summary", label: "Samenvatting", type: "textarea" },
    { key: "content", label: "Inhoud", type: "textarea" },
    { key: "cover_image", label: "Omslagafbeelding", type: "image" },
    { key: "important", label: "Belangrijke aankondiging (vastgepind)", type: "bool" },
    { key: "archived", label: "Gearchiveerd (niet zichtbaar op homepage)", type: "bool" },
  ];
  const empty: NewsInput = {
    title: "",
    category: "Algemeen",
    summary: "",
    content: "",
    cover_image: "",
    publish_date: new Date().toISOString().slice(0, 10),
    author: "",
    important: false,
    archived: false,
  };
  return (
    <>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<NewsArticle>
        title="Nieuws"
        description="Nieuwsberichten op het dashboard. Belangrijke aankondigingen worden bovenaan vastgepind."
        items={news}
        fields={fields}
        emptyItem={empty as Omit<NewsArticle, "id">}
        onAdd={(item) => add.mutate(item as NewsInput)}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<NewsArticle> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={(from, to) => {
          if (from === to) return;
          const next = news.slice();
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          reorder.mutate({ items: next });
        }}
        rowPreview={(n) => (
          <div className="flex items-center gap-3">
            {n.cover_image ? (
              <img src={n.cover_image} alt="" className="h-12 w-16 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-16 rounded-lg bg-accent" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate font-medium text-navy">{n.title}</div>
                {n.important && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-brand-foreground">
                    Vastgepind
                  </span>
                )}
                {n.archived && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Gearchiveerd
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {n.category} · {formatNewsDate(n.publish_date)}
                {n.author ? ` · ${n.author}` : ""}
              </div>
            </div>
          </div>
        )}
      />
    </>
  );
}

/* ---------------- Partners ---------------- */
function PartnersTab() {
  const { partners, addPartner, updatePartner, deletePartner, reorder } = useHubStore();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "href", label: "URL", type: "url" },
  ];
  const empty: Omit<PartnerLink, "id"> = { name: "", href: "https://" };
  return (
    <EntityManager<PartnerLink>
      title="Partnerportalen" description="Externe links als pillen op het dashboard."
      items={partners} fields={fields} emptyItem={empty}
      onAdd={addPartner} onUpdate={updatePartner} onDelete={deletePartner}
      onReorder={(f, t) => reorder("partners", f, t)}
      rowPreview={(p) => (
        <div>
          <div className="font-medium text-navy">{p.name}</div>
          <div className="truncate text-xs text-muted-foreground">{p.href}</div>
        </div>
      )}
    />
  );
}

/* ---------------- Quick Links ---------------- */
function QuickLinksTab() {
  const { quickLinks, addQuickLink, updateQuickLink, deleteQuickLink, reorder } = useHubStore();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "icon", label: "Icoon", type: "icon" },
    { key: "href", label: "URL", type: "url" },
  ];
  const empty: Omit<QuickLink, "id"> = { name: "", href: "https://", icon: "link" };
  return (
    <EntityManager<QuickLink>
      title="Quick links" description="Snelkoppelingen in het welkomstvak."
      items={quickLinks} fields={fields} emptyItem={empty}
      onAdd={addQuickLink} onUpdate={updateQuickLink} onDelete={deleteQuickLink}
      onReorder={(f, t) => reorder("quickLinks", f, t)}
      rowPreview={(q) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-navy"><Icon name={q.icon ?? "link"} size={18} /></div>
          <div className="min-w-0">
            <div className="font-medium text-navy">{q.name}</div>
            <div className="truncate text-xs text-muted-foreground">{q.href}</div>
          </div>
        </div>
      )}
    />
  );
}

/* ---------------- Knowledge categories ---------------- */
function KbCategoriesTab() {
  const { data: categories = [], isLoading } = useKbCategories();
  const { add, update, remove, reorder } = useKbCategoryMutations();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "slug", label: "Slug (URL-deel)", type: "text" },
    { key: "icon", label: "Icoon", type: "icon" },
    { key: "description", label: "Beschrijving", type: "textarea" },
  ];
  const empty: KbCategoryInput = { name: "", slug: "", icon: "book-open", description: "" };
  return (
    <>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<KbCategory>
        title="Kennisbank categorieën"
        description="Categorieën waaronder artikelen worden gegroepeerd."
        items={categories}
        fields={fields}
        emptyItem={empty as Omit<KbCategory, "id">}
        onAdd={(item) => {
          const i = item as KbCategoryInput;
          add.mutate({ ...i, slug: i.slug || slugify(i.name) });
        }}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<KbCategory> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={(from, to) => {
          if (from === to) return;
          const next = categories.slice();
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          reorder.mutate({ items: next });
        }}
        rowPreview={(k) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
              <Icon name={k.icon} size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-navy">{k.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                /{k.slug} · {k.description}
              </div>
            </div>
          </div>
        )}
      />
    </>
  );
}

/* ---------------- Knowledge items ---------------- */
function KbArticlesTab() {
  const { data: sections = [] } = useKbSections();
  const { data: categories = [] } = useKbCategories();
  const { data: articles = [], isLoading } = useKbArticles();
  const { add, update, remove } = useKbArticleMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<KbArticleInput>(emptyArticleInput());
  const [filterSection, setFilterSection] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setDraft(emptyArticleInput(sections[0]?.id));
  };
  const startEdit = (a: KbArticle) => {
    setAdding(false);
    setEditingId(a.id);
    setDraft({
      section_id: a.section_id,
      category_id: a.category_id,
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      content: a.content,
      important_notes: a.important_notes,
      owner: a.owner,
      author: a.author,
      client: a.client,
      document_type: a.document_type,
      version: a.version,
      document_date: a.document_date,
      valid_from: a.valid_from,
      valid_until: a.valid_until,
      tags: a.tags,
      file_url: a.file_url,
      file_name: a.file_name,
      file_size: a.file_size,
      external_url: a.external_url,
      attachments: a.attachments,
      related_ids: a.related_ids,
      status: a.status,
    });
  };
  const cancel = () => {
    setAdding(false);
    setEditingId(null);
  };
  const save = () => {
    const payload: KbArticleInput = {
      ...draft,
      slug: draft.slug || slugify(draft.title),
    };
    if (!payload.title.trim() || !payload.section_id) return;
    if (adding) add.mutate(payload);
    else if (editingId)
      update.mutate({ id: editingId, patch: payload as Partial<KbArticle> });
    cancel();
  };

  const sectionName = (id: string | null) =>
    sections.find((s) => s.id === id)?.name ?? "—";

  const visible = articles.filter((a) => {
    if (filterSection && a.section_id !== filterSection) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-navy">Kennisitems</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Beheer documenten, wiki-artikelen en externe links met versiegeschiedenis en geldigheidsdata.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={sections.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          Nieuw kennisitem
        </button>
      </div>

      {sections.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          Maak eerst een hoofdsectie aan op het tabblad "KB secties".
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2"
        >
          <option value="">Alle secties</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2"
        >
          <option value="">Alle statussen</option>
          {KB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {(adding || editingId) && (
        <ArticleEditor
          draft={draft}
          setDraft={setDraft}
          sections={sections}
          categories={categories}
          articles={articles}
          excludeId={editingId}
          onSave={save}
          onCancel={cancel}
        />
      )}

      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}

      <div className="space-y-2">
        {visible.length === 0 && !adding && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Geen kennisitems.
          </div>
        )}
        {visible.map((a) => {
          if (editingId === a.id) return null;
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate font-medium text-navy">{a.title}</div>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-navy">
                    {sectionName(a.section_id)}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/70">
                    {statusLabel(a.status)}
                  </span>
                  <span className="rounded-full bg-pastel/40 px-2 py-0.5 text-xs font-medium text-navy">
                    {documentTypeLabel(a.document_type)} v{a.version}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  /{a.slug}
                  {a.client ? ` · ${a.client}` : ""}
                  {a.owner ? ` · eigenaar ${a.owner}` : ""}
                  {a.file_name ? ` · ${a.file_name}` : ""}
                </div>
              </div>
              <button
                onClick={() => startEdit(a)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Bewerken
              </button>
              <button
                onClick={() => {
                  if (confirm("Kennisitem verwijderen?")) remove.mutate(a.id);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                Verwijderen
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArticleEditor({
  draft,
  setDraft,
  sections,
  categories,
  articles,
  excludeId,
  onSave,
  onCancel,
}: {
  draft: KbArticleInput;
  setDraft: (d: KbArticleInput) => void;
  sections: KbSection[];
  categories: KbCategory[];
  articles: KbArticle[];
  excludeId: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof KbArticleInput>(k: K, v: KbArticleInput[K]) =>
    setDraft({ ...draft, [k]: v });
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const setAttachment = (i: number, patch: Partial<KbAttachment>) => {
    const next = draft.attachments.slice();
    next[i] = { ...next[i], ...patch };
    set("attachments", next);
  };
  const addAttachment = () =>
    set("attachments", [...draft.attachments, { label: "", url: "" }]);
  const removeAttachment = (i: number) =>
    set("attachments", draft.attachments.filter((_, idx) => idx !== i));

  const toggleRelated = (id: string) => {
    const cur = new Set(draft.related_ids);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    set("related_ids", Array.from(cur));
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (draft.tags.includes(t)) return;
    set("tags", [...draft.tags, t]);
    setTagInput("");
  };
  const removeTag = (t: string) =>
    set(
      "tags",
      draft.tags.filter((x) => x !== t),
    );

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadKbDocument(file);
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      const docType: KbDocumentType =
        ext === "pdf"
          ? "pdf"
          : ["doc", "docx"].includes(ext)
            ? "word"
            : ["xls", "xlsx", "csv"].includes(ext)
              ? "excel"
              : ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
                ? "afbeelding"
                : "overig";
      setDraft({
        ...draft,
        file_url: res.url,
        file_name: res.name,
        file_size: res.size,
        document_type: draft.document_type === "wiki" ? docType : draft.document_type,
      });
    } catch (err) {
      console.error(err);
      alert("Uploaden mislukt.");
    } finally {
      setUploading(false);
    }
  };

  const selectableArticles = articles.filter((a) => a.id !== excludeId);
  const subCats = categories;

  return (
    <div className="space-y-5 rounded-2xl border border-brand/40 bg-card p-5 shadow-sm">
      {/* Basics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Titel" full>
          <input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Hoofdsectie">
          <select
            value={draft.section_id ?? ""}
            onChange={(e) => set("section_id", e.target.value || null)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">— Kies —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sub-categorie (optioneel)">
          <select
            value={draft.category_id ?? ""}
            onChange={(e) => set("category_id", e.target.value || null)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">— Geen —</option>
            {subCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Slug (URL-deel)">
          <input
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="auto op basis van titel"
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Status">
          <select
            value={draft.status}
            onChange={(e) => set("status", e.target.value as KbStatus)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          >
            {KB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Documenttype">
          <select
            value={draft.document_type}
            onChange={(e) => set("document_type", e.target.value as KbDocumentType)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          >
            {KB_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {documentTypeLabel(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Versie">
          <input
            value={draft.version}
            onChange={(e) => set("version", e.target.value)}
            placeholder="bijv. 1.0"
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Opdrachtgever">
          <input
            value={draft.client}
            onChange={(e) => set("client", e.target.value)}
            placeholder="bijv. Liander, Stedin, intern"
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Eigenaar">
          <input
            value={draft.owner}
            onChange={(e) => set("owner", e.target.value)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Auteur">
          <input
            value={draft.author}
            onChange={(e) => set("author", e.target.value)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Documentdatum">
          <input
            type="date"
            value={draft.document_date ?? ""}
            onChange={(e) => set("document_date", e.target.value || null)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Geldig vanaf">
          <input
            type="date"
            value={draft.valid_from ?? ""}
            onChange={(e) => set("valid_from", e.target.value || null)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
        <Field label="Geldig tot">
          <input
            type="date"
            value={draft.valid_until ?? ""}
            onChange={(e) => set("valid_until", e.target.value || null)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
      </div>

      {/* Summary, important notes, content */}
      <Field label="Korte beschrijving" full>
        <textarea
          rows={2}
          value={draft.summary}
          onChange={(e) => set("summary", e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
      </Field>
      <Field label="Belangrijke notities" full>
        <textarea
          rows={2}
          value={draft.important_notes}
          onChange={(e) => set("important_notes", e.target.value)}
          placeholder="Wordt prominent getoond bovenaan het document."
          className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
      </Field>
      <Field label="Inhoud (wiki / samenvatting)" full>
        <textarea
          rows={10}
          value={draft.content}
          onChange={(e) => set("content", e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-6 outline-none focus:ring-2 focus:ring-brand/40"
        />
      </Field>

      {/* File + external link */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-sm font-medium text-foreground/80">Document</div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:border-brand/40">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            {draft.file_name ? (
              <span className="text-navy">
                {draft.file_name}
                {draft.file_size > 0 ? ` · ${formatFileSize(draft.file_size)}` : ""}
              </span>
            ) : (
              <span>PDF, Word of Excel uploaden</span>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {draft.file_url && (
            <button
              type="button"
              onClick={() =>
                setDraft({ ...draft, file_url: "", file_name: "", file_size: 0 })
              }
              className="mt-1 text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Bestand verwijderen
            </button>
          )}
        </div>
        <Field label="Externe URL (bijv. SharePoint)">
          <input
            value={draft.external_url}
            onChange={(e) => set("external_url", e.target.value)}
            placeholder="https://terrevolt.sharepoint.com/…"
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Field>
      </div>

      {/* Tags */}
      <div>
        <div className="mb-2 text-sm font-medium text-foreground/80">Tags</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {draft.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-navy"
            >
              #{t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="tag toevoegen…"
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
      </div>

      {/* Extra attachments */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground/80">Aanvullende bijlagen</span>
          <button
            onClick={addAttachment}
            className="text-sm font-medium text-brand hover:underline"
          >
            + Bijlage toevoegen
          </button>
        </div>
        {draft.attachments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            Geen aanvullende bijlagen.
          </div>
        ) : (
          <div className="space-y-2">
            {draft.attachments.map((att, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  placeholder="Naam"
                  value={att.label}
                  onChange={(e) => setAttachment(i, { label: e.target.value })}
                  className="min-w-[140px] flex-1 rounded-lg border border-border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                />
                <input
                  placeholder="https://…"
                  value={att.url}
                  onChange={(e) => setAttachment(i, { url: e.target.value })}
                  className="min-w-[200px] flex-[2] rounded-lg border border-border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                />
                <button
                  onClick={() => removeAttachment(i)}
                  className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related */}
      <div>
        <div className="mb-2 text-sm font-medium text-foreground/80">
          Gerelateerde documenten ({draft.related_ids.length})
        </div>
        {selectableArticles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            Geen andere documenten om te koppelen.
          </div>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {selectableArticles.map((a) => {
              const checked = draft.related_ids.includes(a.id);
              const sec = sections.find((s) => s.id === a.section_id);
              return (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRelated(a.id)}
                    className="h-4 w-4 accent-[color:var(--brand)]"
                  />
                  <span className="font-medium text-navy">{a.title}</span>
                  <span className="text-xs text-muted-foreground">{sec?.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent"
        >
          Annuleren
        </button>
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`text-sm ${full ? "md:col-span-3" : ""}`}>
      <span className="mb-1 block font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}

