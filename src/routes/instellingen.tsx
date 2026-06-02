import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { EntityManager, type Field } from "@/components/hub/EntityManager";
import { useHubStore, type AppItem, type NewsItem, type PartnerLink, type QuickLink, type KnowledgeCategory } from "@/lib/hub-store";
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
  const { apps, addApp, updateApp, deleteApp, reorder } = useHubStore();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "icon", label: "Icoon", type: "icon" },
    { key: "description", label: "Beschrijving", type: "textarea" },
    { key: "category", label: "Categorie", type: "text" },
    { key: "href", label: "URL", type: "url" },
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
    { key: "featured", label: "Uitgelicht", type: "bool" },
    { key: "newTab", label: "Openen in nieuw tabblad", type: "bool" },
  ];
  const empty: Omit<AppItem, "id"> = {
    name: "", description: "", icon: "sparkles", category: "Algemeen", href: "/", featured: false, newTab: false, accent: "brand",
  };
  return (
    <EntityManager<AppItem>
      title="Applicaties" description="Tools die op het dashboard verschijnen."
      items={apps} fields={fields} emptyItem={empty}
      onAdd={addApp} onUpdate={updateApp} onDelete={deleteApp}
      onReorder={(f, t) => reorder("apps", f, t)}
      rowPreview={(a) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy"><Icon name={a.icon} size={20} /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate font-medium text-navy">{a.name}</div>
              {a.featured && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">Uitgelicht</span>}
            </div>
            <div className="truncate text-xs text-muted-foreground">{a.category} · {a.href}</div>
          </div>
        </div>
      )}
    />
  );
}

/* ---------------- News ---------------- */
function NewsTab() {
  const { news, addNews, updateNews, deleteNews, reorder } = useHubStore();
  const fields: Field[] = [
    { key: "title", label: "Titel", type: "text" },
    { key: "category", label: "Categorie", type: "text" },
    { key: "date", label: "Datum", type: "date" },
    { key: "excerpt", label: "Samenvatting", type: "textarea" },
    { key: "image", label: "Afbeelding", type: "image" },
    { key: "important", label: "Belangrijk", type: "bool" },
  ];
  const empty: Omit<NewsItem, "id"> = {
    title: "", category: "Algemeen", excerpt: "", image: "", date: new Date().toLocaleDateString("nl-NL"), important: false,
  };
  return (
    <EntityManager<NewsItem>
      title="Nieuws" description="Berichten op de nieuwskaarten."
      items={news} fields={fields} emptyItem={empty}
      onAdd={addNews} onUpdate={updateNews} onDelete={deleteNews}
      onReorder={(f, t) => reorder("news", f, t)}
      rowPreview={(n) => (
        <div className="flex items-center gap-3">
          {n.image
            ? <img src={n.image} alt="" className="h-12 w-16 rounded-lg object-cover" />
            : <div className="h-12 w-16 rounded-lg bg-accent" />
          }
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate font-medium text-navy">{n.title}</div>
              {n.important && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-brand-foreground">Belangrijk</span>}
            </div>
            <div className="truncate text-xs text-muted-foreground">{n.category} · {n.date}</div>
          </div>
        </div>
      )}
    />
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl">{k.icon}</div>
          <div className="min-w-0">
            <div className="font-medium text-navy">{k.name}</div>
            <div className="truncate text-xs text-muted-foreground">/{k.slug} · {k.description}</div>
          </div>
        </div>
      )}
    />
  );
}
