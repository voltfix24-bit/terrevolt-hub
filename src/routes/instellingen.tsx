import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { EntityManager, type Field } from "@/components/hub/EntityManager";
import { useHubStore, type PartnerLink, type QuickLink, type KnowledgeCategory } from "@/lib/hub-store";
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
import { Icon } from "@/components/hub/Icon";
import { RotateCcw } from "lucide-react";

export const Route = createFileRoute("/instellingen")({
  head: () => ({ meta: [{ title: "Instellingen — TerreVolt Hub" }] }),
  component: SettingsPage,
});

const TABS = [
  { id: "apps", label: "Applicaties" },
  { id: "news", label: "Nieuws" },
  { id: "partners", label: "Partnerportalen" },
  { id: "quick", label: "Quick links" },
  { id: "knowledge", label: "Kennisbank" },
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
        {tab === "knowledge" && <KnowledgeTab />}
      </div>
    </HubLayout>
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

/* ---------------- Knowledge ---------------- */
function KnowledgeTab() {
  const { knowledge, addKnowledge, updateKnowledge, deleteKnowledge, reorder } = useHubStore();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "slug", label: "Slug (URL-deel)", type: "text" },
    { key: "icon", label: "Icoon", type: "icon" },
    { key: "description", label: "Beschrijving", type: "textarea" },
  ];
  const empty: Omit<KnowledgeCategory, "id"> = { name: "", slug: "", icon: "book-open", description: "" };
  return (
    <EntityManager<KnowledgeCategory>
      title="Kennisbank" description="Categorieën die op het dashboard verschijnen."
      items={knowledge} fields={fields} emptyItem={empty}
      onAdd={addKnowledge} onUpdate={updateKnowledge} onDelete={deleteKnowledge}
      onReorder={(f, t) => reorder("knowledge", f, t)}
      rowPreview={(k) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy"><Icon name={k.icon} size={20} /></div>
          <div className="min-w-0">
            <div className="font-medium text-navy">{k.name}</div>
            <div className="truncate text-xs text-muted-foreground">/{k.slug} · {k.description}</div>
          </div>
        </div>
      )}
    />
  );
}
