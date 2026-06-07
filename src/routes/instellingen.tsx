import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import { EntityManager, type Field } from "@/components/hub/EntityManager";
import {
  useQuickLinks,
  useQuickLinkMutations,
  type QuickLink,
  type QuickLinkInput,
} from "@/lib/quickLinks";
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
  useAllUserPermissions,
  useUserPermissionMutations,
  APP_ROLES,
  APP_PERMISSIONS,
  roleLabel,
  type UserRole,
  type UserRoleInput,
  type AppPermission,
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
  DOC_VISIBILITIES,
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
  type DocVisibility,
} from "@/lib/knowledge";

import { Icon } from "@/components/hub/Icon";
import { PermissionGate } from "@/components/hub/PermissionGate";
import { Upload, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/instellingen")({
  head: () => ({ meta: [{ title: "Instellingen — TerreVolt Intranet" }] }),
  component: SettingsPageGated,
});

function SettingsPageGated() {
  return (
    <PermissionGate
      permissions={["manage_settings", "manage_users"]}
      deniedMessage="Alleen beheerders met instellingen- of gebruikersrechten kunnen deze pagina openen."
    >
      <SettingsPage />
    </PermissionGate>
  );
}


const TABS = [
  { id: "apps", label: "Applicaties" },
  { id: "news", label: "Nieuws" },
  { id: "partners", label: "Partnerportalen" },
  { id: "quick", label: "Quick links" },
  { id: "departments", label: "Afdelingen" },
  { id: "roles", label: "Rollen" },
  { id: "access", label: "Toegang & rechten" },
  { id: "kb-sections", label: "KB secties" },
  { id: "kb-cats", label: "KB sub-categorieën" },
  { id: "kb-articles", label: "KB kennisitems" },
  { id: "search-index", label: "Zoekindex" },
  { id: "audit", label: "Audit log" },

] as const;
type TabId = (typeof TABS)[number]["id"];

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("apps");

  return (
    <HubLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader title="Instellingen" subtitle="Beheer alle homepage-inhoud op één plek." />
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
        {tab === "access" && <AccessTab />}
        {tab === "kb-sections" && <KbSectionsTab />}
        {tab === "kb-cats" && <KbCategoriesTab />}
        {tab === "kb-articles" && <KbArticlesTab />}
        {tab === "search-index" && <SearchIndexTab />}
        {tab === "audit" && <AuditLogTab />}

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

/* ---------------- Partners (DB-backed) ---------------- */
function PartnersTab() {
  const { data: partners = [], isLoading } = usePartnerLinks();
  const { add, update, remove, reorder } = usePartnerLinkMutations();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "description", label: "Beschrijving", type: "textarea" },
    { key: "href", label: "URL", type: "url" },
    { key: "icon", label: "Icoon", type: "icon" },
    {
      key: "category",
      label: "Categorie",
      type: "select",
      options: PARTNER_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    { key: "active", label: "Actief (zichtbaar)", type: "bool" },
  ];
  const empty: PartnerLinkInput = {
    name: "",
    href: "https://",
    description: "",
    icon: "globe",
    accent: "brand",
    category: "Opdrachtgever",
    active: true,
  };
  return (
    <>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<PartnerLink>
        title="Partnerportalen"
        description="Externe portalen van opdrachtgevers, leveranciers en onderaannemers."
        items={partners}
        fields={fields}
        emptyItem={empty as Omit<PartnerLink, "id">}
        onAdd={(item) => add.mutate(item as PartnerLinkInput)}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<PartnerLink> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={(from, to) => {
          if (from === to) return;
          const next = partners.slice();
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          reorder.mutate({ items: next });
        }}
        rowPreview={(p) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
              <Icon name={p.icon} size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate font-medium text-navy">{p.name}</div>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-foreground/70">
                  {p.category}
                </span>
                {!p.active && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Inactief
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">{p.href}</div>
            </div>
          </div>
        )}
      />
    </>
  );
}

/* ---------------- Departments ---------------- */
function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const { add, update, remove } = useDepartmentMutations();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "description", label: "Beschrijving", type: "textarea" },
    { key: "icon", label: "Icoon", type: "icon" },
  ];
  const empty: DepartmentInput = { name: "", description: "", icon: "users", accent: "brand" };
  return (
    <>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<Department>
        title="Afdelingen"
        description="Organisatie-eenheden voor het Smoelenboek en de kennisbank."
        items={departments}
        fields={fields}
        emptyItem={empty as Omit<Department, "id">}
        onAdd={(item) => add.mutate(item as DepartmentInput)}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<Department> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={() => undefined}
        rowPreview={(d) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-navy">
              <Icon name={d.icon} size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-navy">{d.name}</div>
              <div className="truncate text-xs text-muted-foreground">{d.description}</div>
            </div>
          </div>
        )}
      />
    </>
  );
}

/* ---------------- Roles ---------------- */
function RolesTab() {
  const { data: roles = [], isLoading } = useUserRoles();
  const { add, update, remove } = useUserRoleMutations();
  const fields: Field[] = [
    { key: "display_name", label: "Naam", type: "text" },
    { key: "email", label: "E-mail", type: "text" },
    { key: "user_id", label: "Gebruikers-ID (UUID)", type: "text" },
    {
      key: "role",
      label: "Rol",
      type: "select",
      options: APP_ROLES.map((r) => ({ value: r.value, label: `${r.label} — ${r.description}` })),
    },
    { key: "active", label: "Actief (toegang tot intranet)", type: "bool" },
  ];
  const empty: UserRoleInput = {
    user_id: "00000000-0000-0000-0000-000000000000",
    display_name: "",
    email: "",
    role: "kantoor",
    active: true,
  };
  return (
    <>
      <div className="mb-4 rounded-2xl border border-border bg-card/60 p-4 text-sm text-foreground/70">
        <p className="font-medium text-navy">Rolbeheer</p>
        <p className="mt-1">
          Wijs één van vijf rollen toe aan een gebruiker:{" "}
          {APP_ROLES.map((r) => r.label).join(", ")}. Rollen worden later gekoppeld aan
          inloggegevens voor automatische rechten in het TerreVolt Intranet.
        </p>
      </div>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<UserRole>
        title="Gebruikersrollen"
        description="Beheer wie welke rol heeft binnen TerreVolt Intranet."
        items={roles}
        fields={fields}
        emptyItem={empty as Omit<UserRole, "id">}
        onAdd={(item) => add.mutate(item as UserRoleInput)}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<UserRole> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={() => undefined}
        rowPreview={(r) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate font-medium text-navy">
                {r.display_name || r.email || "Onbekend"}
              </div>
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                {roleLabel(r.role)}
              </span>
              {!r.active && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Inactief
                </span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">{r.email || r.user_id}</div>
          </div>
        )}
      />
    </>
  );
}

/* ---------------- Access matrix (extra permissions) ---------------- */
function AccessTab() {
  const { data: roles = [], isLoading } = useUserRoles();
  const { data: perms = [], isLoading: pLoading } = useAllUserPermissions();
  const { update } = useUserRoleMutations();
  const { grant, revoke } = useUserPermissionMutations();

  if (isLoading || pLoading) {
    return <div className="text-sm text-muted-foreground">Laden…</div>;
  }

  const permByUser = new Map<string, Set<AppPermission>>();
  for (const p of perms) {
    if (!permByUser.has(p.user_id)) permByUser.set(p.user_id, new Set());
    permByUser.get(p.user_id)!.add(p.permission as AppPermission);
  }

  const toggle = (user_id: string, permission: AppPermission, has: boolean) => {
    if (has) revoke.mutate({ user_id, permission });
    else grant.mutate({ user_id, permission });
  };

  return (
    <>
      <div className="mb-4 rounded-2xl border border-border bg-card/60 p-4 text-sm text-foreground/70">
        <p className="font-medium text-navy">Toegang & extra rechten</p>
        <p className="mt-1">
          Zet gebruikers actief/inactief en ken extra module-rechten toe. Admins hebben automatisch
          alle rechten; management/finance/planning hebben standaard toegang tot hun module.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-accent/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Gebruiker</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Actief</th>
              {APP_PERMISSIONS.map((p) => (
                <th key={p.value} className="px-3 py-3 font-medium" title={p.description}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((u) => {
              const userPerms = permByUser.get(u.user_id) ?? new Set<AppPermission>();
              return (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy">
                      {u.display_name || u.email || "Onbekend"}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      value={u.role}
                      onChange={(e) =>
                        update.mutate({
                          id: u.id,
                          patch: { role: e.target.value as UserRole["role"] },
                        })
                      }
                    >
                      {APP_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={u.active}
                        onChange={(e) =>
                          update.mutate({ id: u.id, patch: { active: e.target.checked } })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {u.active ? "Ja" : "Nee"}
                      </span>
                    </label>
                  </td>
                  {APP_PERMISSIONS.map((p) => {
                    const has = userPerms.has(p.value);
                    return (
                      <td key={p.value} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={has}
                          onChange={() => toggle(u.user_id, p.value, has)}
                          aria-label={`${p.label} voor ${u.display_name || u.email}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {roles.length === 0 && (
              <tr>
                <td
                  colSpan={3 + APP_PERMISSIONS.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Nog geen gebruikers. Voeg ze eerst toe via het tabblad "Rollen".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Quick Links (DB-backed) ---------------- */
function QuickLinksTab() {
  const { data: quickLinks = [], isLoading } = useQuickLinks();
  const { add, update, remove, reorder } = useQuickLinkMutations();
  const fields: Field[] = [
    { key: "name", label: "Naam", type: "text" },
    { key: "icon", label: "Icoon", type: "icon" },
    { key: "href", label: "URL", type: "url" },
    { key: "active", label: "Actief (zichtbaar)", type: "bool" },
  ];
  const empty: QuickLinkInput = { name: "", href: "https://", icon: "link", active: true };
  return (
    <>
      {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
      <EntityManager<QuickLink>
        title="Quick links" description="Snelkoppelingen in het welkomstvak."
        items={quickLinks} fields={fields} emptyItem={empty as Omit<QuickLink, "id">}
        onAdd={(item) => add.mutate(item as QuickLinkInput)}
        onUpdate={(id, patch) => update.mutate({ id, patch: patch as Partial<QuickLink> })}
        onDelete={(id) => remove.mutate(id)}
        onReorder={(from, to) => {
          if (from === to) return;
          const next = quickLinks.slice();
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          reorder.mutate({ items: next });
        }}
        rowPreview={(q) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-navy"><Icon name={q.icon ?? "link"} size={18} /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-navy">{q.name}</div>
                {!q.active && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactief</span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">{q.href}</div>
            </div>
          </div>
        )}
      />
    </>

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
      file_path: a.file_path,
      extraction_status: a.extraction_status,
      extraction_error: a.extraction_error,
      extracted_page_count: a.extracted_page_count,
      extracted_at: a.extracted_at,
      external_url: a.external_url,
      attachments: a.attachments,
      related_ids: a.related_ids,
      status: a.status,
      visibility: a.visibility,
    });

  };
  const cancel = () => {
    setAdding(false);
    setEditingId(null);
  };
  const save = async () => {
    const payload: KbArticleInput = {
      ...draft,
      slug: draft.slug || slugify(draft.title),
    };
    if (!payload.title.trim() || !payload.section_id) return;
    let articleId: string | null = null;
    if (adding) {
      const created = await add.mutateAsync(payload);
      articleId = created.id;
    } else if (editingId) {
      await update.mutateAsync({ id: editingId, patch: payload as Partial<KbArticle> });
      articleId = editingId;
    }
    if (articleId && payload.file_path && payload.extraction_status === "pending") {
      supabase.functions
        .invoke("extract_pdf_text", { body: { article_id: articleId } })
        .catch((e) => console.warn("PDF extractie niet gestart:", e));
    }
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
        file_path: res.path,
        extraction_status: ext === "pdf" ? "pending" : "not_applicable",
        extraction_error: "",
        extracted_page_count: 0,
        extracted_at: null,
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
        <Field label="Zichtbaarheid">
          <select
            value={draft.visibility}
            onChange={(e) => set("visibility", e.target.value as DocVisibility)}
            className="w-full rounded-xl border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          >
            {DOC_VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value} title={v.hint}>
                {v.label}
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
                setDraft({
                  ...draft,
                  file_url: "",
                  file_name: "",
                  file_size: 0,
                  file_path: "",
                  extraction_status: "not_applicable",
                  extraction_error: "",
                  extracted_page_count: 0,
                  extracted_at: null,
                })
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


/* ---------------- Search index (semantic reindex) ---------------- */
function SearchIndexTab() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    counts: Record<string, number>;
    removed?: number;
    duration_ms: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ["kb_chunks_count"],
    queryFn: async (): Promise<{ total: number; last_indexed: string | null }> => {
      const { data, error } = await (supabase as unknown as {
        rpc: (
          name: string,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc("count_kb_chunks");
      if (error) throw error;
      const row = ((data as Array<{ total: number; last_indexed: string | null }>) ?? [])[0];
      return { total: Number(row?.total ?? 0), last_indexed: row?.last_indexed ?? null };
    },
  });

  const onReindex = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("reindex_all");
      if (error) throw error;
      const r = data as {
        ok?: boolean;
        total?: number;
        counts?: Record<string, number>;
        removed?: number;
        duration_ms?: number;
        error?: string;
      };
      if (!r.ok) throw new Error(r.error ?? "Onbekende fout");
      setResult({
        total: r.total ?? 0,
        counts: r.counts ?? {},
        removed: r.removed,
        duration_ms: r.duration_ms ?? 0,
      });
      statsQuery.refetch();
    } catch (e) {
      console.error(e);
      setError((e as Error).message ?? "Reindex mislukt");
    } finally {
      setBusy(false);
    }
  };

  const SOURCE_LABELS: Record<string, string> = {
    kb_article: "kennisartikelen",
    news: "nieuwsberichten",
    finance_client: "finance-klanten",
    person: "mensen",
    application: "applicaties",
    sharepoint_item: "SharePoint-items",
    partner_link: "partners",
    quick_link: "quick links",
    department: "afdelingen",
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-navy">Zoekindex</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          De Vraagbaak gebruikt een semantische zoekindex. Wijzigingen aan kennisartikelen,
          nieuws, mensen, applicaties en andere bronnen worden automatisch verwerkt — meestal
          binnen 1-2 minuten.
        </p>
      </div>

      <ReindexQueueCard
        totalChunks={statsQuery.data?.total ?? null}
        lastIndexed={statsQuery.data?.last_indexed ?? null}
      />

      <PdfExtractionCard />
      <VraagbaakCacheCard />

      <details className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-navy">
          Geavanceerd: volledige herindexering
        </summary>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <p>
            Verwerkt alle bronnen opnieuw en re-embedt alles. Alleen nodig in noodgevallen
            (corrupte index, na grote migraties). Kost AI-credits — voor normale wijzigingen
            werkt de automatische verwerking hierboven.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onReindex}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Bezig…" : "Volledig opnieuw indexeren"}
            </button>
          </div>
          {result && (
            <div className="rounded-xl border border-brand/30 bg-pastel/30 p-3 text-sm text-navy">
              <div className="font-medium">
                {result.total} chunks geïndexeerd in {(result.duration_ms / 1000).toFixed(1)}s
                {typeof result.removed === "number" && result.removed > 0
                  ? ` · ${result.removed} verouderd verwijderd`
                  : ""}
              </div>
              <div className="mt-1 text-xs text-foreground/80">
                {Object.entries(result.counts)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => `${n} ${SOURCE_LABELS[k] ?? k}`)
                  .join(" · ")}
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

/* ---------------- Auto-reindex queue ---------------- */
type ReindexQueueStats = {
  pending: number;
  failed: number;
  oldest_age_seconds: number;
};
type ReindexFailedItem = {
  id: string;
  source_type: string;
  source_id: string;
  operation: string;
  attempts: number;
  last_attempt_at: string | null;
  last_error: string;
  enqueued_at: string;
};

function ReindexQueueCard({
  totalChunks,
  lastIndexed,
}: {
  totalChunks: number | null;
  lastIndexed: string | null;
}) {
  const qc = useQueryClient();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ReindexFailedItem | null>(null);

  const statsQ = useQuery({
    queryKey: ["reindex_queue_stats"],
    refetchInterval: 15000,
    queryFn: async (): Promise<ReindexQueueStats> => {
      const { data, error } = await (supabase as unknown as {
        rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc("reindex_queue_stats");
      if (error) throw error;
      const row = ((data as ReindexQueueStats[]) ?? [])[0];
      return {
        pending: Number(row?.pending ?? 0),
        failed: Number(row?.failed ?? 0),
        oldest_age_seconds: Number(row?.oldest_age_seconds ?? 0),
      };
    },
  });

  const failedQ = useQuery({
    queryKey: ["reindex_queue_failed"],
    refetchInterval: 30000,
    queryFn: async (): Promise<ReindexFailedItem[]> => {
      const { data, error } = await (supabase as unknown as {
        rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc("reindex_queue_failed_items");
      if (error) throw error;
      return (data as ReindexFailedItem[]) ?? [];
    },
  });

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      const { error } = await (supabase as unknown as {
        rpc: (n: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      }).rpc("reindex_queue_retry", { item_id: id });
      if (error) throw error;
      toast.success("Item teruggezet in de wachtrij");
      setDetailItem(null);
      qc.invalidateQueries({ queryKey: ["reindex_queue_stats"] });
      qc.invalidateQueries({ queryKey: ["reindex_queue_failed"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRetrying(null);
    }
  };

  const retryAll = async () => {
    setRetrying("all");
    try {
      const { error } = await (supabase as unknown as {
        rpc: (n: string) => Promise<{ error: { message: string } | null }>;
      }).rpc("reindex_queue_retry_all");
      if (error) throw error;
      toast.success("Alle mislukte items teruggezet");
      qc.invalidateQueries({ queryKey: ["reindex_queue_stats"] });
      qc.invalidateQueries({ queryKey: ["reindex_queue_failed"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRetrying(null);
    }
  };

  const pending = statsQ.data?.pending ?? 0;
  const failed = statsQ.data?.failed ?? 0;
  const oldestAge = statsQ.data?.oldest_age_seconds ?? 0;
  const items = failedQ.data ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium text-navy">Automatische verwerking</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {totalChunks ?? "—"} stukken geïndexeerd
            {lastIndexed
              ? ` · laatst: ${new Date(lastIndexed).toLocaleString("nl-NL")}`
              : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-lg px-2.5 py-1 ${pending > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
            {pending} wachtend
          </span>
          <span className={`rounded-lg px-2.5 py-1 ${failed > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
            {failed} mislukt
          </span>
          {pending > 0 && oldestAge > 60 && (
            <span className="rounded-lg bg-muted px-2.5 py-1 text-muted-foreground">
              oudste: {Math.round(oldestAge / 60)} min
            </span>
          )}
        </div>
      </div>

      {failed > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-navy">Mislukte items</h4>
            <button
              onClick={retryAll}
              disabled={retrying === "all"}
              className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
            >
              {retrying === "all" ? "Bezig…" : "Alles opnieuw proberen"}
            </button>
          </div>
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li key={it.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-navy">
                      {it.source_type} · {it.operation}
                    </div>
                    <div className="truncate text-muted-foreground" title={it.source_id}>
                      {it.source_id}
                    </div>
                    {it.last_error && (
                      <div className="mt-1 line-clamp-2 break-words text-destructive">{it.last_error}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => retry(it.id)}
                      disabled={retrying === it.id}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {retrying === it.id ? "…" : "Opnieuw"}
                    </button>
                    <button
                      onClick={() => setDetailItem(it)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foutmelding</DialogTitle>
            <DialogDescription>
              {detailItem
                ? `${detailItem.source_type} · ${detailItem.operation} · ${detailItem.attempts} poging(en)`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-1 text-xs text-muted-foreground">
                <div><span className="font-medium text-navy">Source ID:</span> <code className="break-all">{detailItem.source_id}</code></div>
                <div><span className="font-medium text-navy">In wachtrij sinds:</span> {new Date(detailItem.enqueued_at).toLocaleString("nl-NL")}</div>
                {detailItem.last_attempt_at && (
                  <div><span className="font-medium text-navy">Laatste poging:</span> {new Date(detailItem.last_attempt_at).toLocaleString("nl-NL")}</div>
                )}
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-navy">Volledige foutmelding</div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
{detailItem.last_error || "(geen foutmelding beschikbaar)"}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => detailItem && retry(detailItem.id)}
              disabled={!detailItem || retrying === detailItem.id}
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {detailItem && retrying === detailItem.id ? "Bezig…" : "Opnieuw proberen"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {failed === 0 && pending === 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          Alles is up-to-date. Nieuwe wijzigingen worden automatisch verwerkt.
        </div>
      )}
    </div>
  );
}

/* ---------------- Vraagbaak semantic cache ---------------- */
function VraagbaakCacheCard() {
  const qc = useQueryClient();
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stats = useQuery({
    queryKey: ["vraagbaak_cache_stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc("vraagbaak_cache_stats");
      if (error) throw error;
      const row = ((data as Array<{
        total_cached: number;
        active_cached: number;
        invalidated: number;
        expired: number;
        total_hits: number;
        most_asked: string | null;
        most_asked_hits: number | null;
      }>) ?? [])[0];
      return row ?? null;
    },
  });

  const onClear = async () => {
    setClearing(true);
    try {
      const { error } = await (supabase as unknown as {
        rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc("vraagbaak_clear_cache");
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["vraagbaak_cache_stats"] });
      setConfirmOpen(false);
    } catch (e) {
      console.error(e);
      alert("Cache wissen mislukt: " + (e as Error).message);
    } finally {
      setClearing(false);
    }
  };

  const s = stats.data;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-navy">Vraagbaak cache</div>
          <div className="text-xs text-muted-foreground">
            Hergebruikt antwoorden bij vrijwel-identieke vragen om AI-kosten te besparen.
          </div>
        </div>
        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!s || s.active_cached === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-card px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            Hele cache wissen
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/80">Zeker weten?</span>
            <button
              onClick={onClear}
              disabled={clearing}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground disabled:opacity-50"
            >
              {clearing ? "Bezig…" : "Ja, wis alles"}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              Annuleren
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Totaal vragen" value={s?.total_cached ?? "—"} />
        <Stat label="Actief in cache" value={s?.active_cached ?? "—"} />
        <Stat label="Ongeldig gemaakt" value={s?.invalidated ?? "—"} />
        <Stat label="Cache-hits totaal" value={s?.total_hits ?? "—"} />
      </div>

      {s?.most_asked && (
        <div className="mt-4 rounded-xl border border-border bg-accent/30 p-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Meest gestelde vraag
          </div>
          <div className="mt-1 font-medium text-navy">{s.most_asked}</div>
          <div className="text-xs text-muted-foreground">
            {s.most_asked_hits ?? 0}× hergebruikt
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-navy">{value}</div>
    </div>
  );
}

/* ---------------- PDF text extraction ---------------- */
type PdfStats = {
  total_with_pdf: number;
  extracted_ok: number;
  pending: number;
  scanned: number;
  failed: number;
  too_large: number;
  total_pages: number;
  avg_chars: number;
};

function PdfExtractionCard() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ["pdf_extraction_stats"],
    queryFn: async (): Promise<PdfStats> => {
      const { data, error } = await (supabase as unknown as {
        rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc("pdf_extraction_stats");
      if (error) throw error;
      const row = ((data as PdfStats[]) ?? [])[0];
      return (
        row ?? {
          total_with_pdf: 0,
          extracted_ok: 0,
          pending: 0,
          scanned: 0,
          failed: 0,
          too_large: 0,
          total_pages: 0,
          avg_chars: 0,
        }
      );
    },
  });

  const attentionQuery = useQuery({
    queryKey: ["pdf_attention"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kb_articles")
        .select("id,title,extraction_status,extraction_error,file_name")
        .in("extraction_status", ["failed", "scanned", "too_large"])
        .order("extracted_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        extraction_status: string;
        extraction_error: string;
        file_name: string;
      }>;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pdf_extraction_stats"] });
    qc.invalidateQueries({ queryKey: ["pdf_attention"] });
  };

  const runAllPending = async () => {
    setBusy(true);
    setError(null);
    setProgress("PDF's verwerken…");
    try {
      let totalProcessed = 0;
      const startFailed = s?.failed ?? 0;
      const startScanned = s?.scanned ?? 0;
      const startTooLarge = s?.too_large ?? 0;
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase.functions.invoke("extract_pdf_text", {
          body: { all_pending: true },
        });
        if (error) throw error;
        const r = data as { processed?: number; remaining_hint?: boolean; error?: string };
        if (r.error) throw new Error(r.error);
        totalProcessed += r.processed ?? 0;
        setProgress(`PDF's verwerken… (${totalProcessed} verwerkt)`);
        if (!r.processed || !r.remaining_hint) break;
      }

      // Phase 2: only reindex if we actually processed something
      if (totalProcessed > 0) {
        setProgress("PDF-inhoud indexeren…");
        const { error: reindexErr } = await supabase.functions.invoke("reindex_all", {
          body: { source_filter: ["kb_article"] },
        });
        if (reindexErr) throw reindexErr;
        toast.success(
          `${totalProcessed} PDF${totalProcessed === 1 ? "" : "'s"} verwerkt en geïndexeerd. Inhoud is nu doorzoekbaar in de Vraagbaak.`,
        );
        setProgress(`Klaar. ${totalProcessed} verwerkt en geïndexeerd.`);
      } else {
        setProgress("Geen wachtende PDF's gevonden.");
      }

      refresh();

      // Check fresh stats for new problems and warn if any
      const { data: freshData } = await (supabase as unknown as {
        rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc("pdf_extraction_stats");
      const fresh = ((freshData as PdfStats[]) ?? [])[0];
      if (fresh) {
        const newProblems =
          (fresh.failed - startFailed) +
          (fresh.scanned - startScanned) +
          (fresh.too_large - startTooLarge);
        if (newProblems > 0) {
          toast.warning(
            `Let op: ${newProblems} PDF${newProblems === 1 ? "" : "'s"} konden niet worden verwerkt. Bekijk ze onder 'Aandacht nodig'.`,
          );
        }
      }
    } catch (e) {
      setError((e as Error).message ?? "Verwerken mislukt");
      toast.error("Verwerken mislukt: " + ((e as Error).message ?? ""));
    } finally {
      setBusy(false);
    }
  };

  const retryOne = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke("extract_pdf_text", {
        body: { article_id: id, force: true },
      });
      if (error) throw error;
      refresh();
    } catch (e) {
      alert("Opnieuw proberen mislukt: " + (e as Error).message);
    }
  };

  const s = statsQuery.data;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-navy">PDF-extractie</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Haalt tekst uit geüploade PDF&apos;s zodat de Vraagbaak de inhoud kan doorzoeken.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deze knop verwerkt PDF&apos;s en updatet daarna automatisch de zoekindex voor artikelen.
            Voor de eerste indexering van overige content (nieuws, mensen, applicaties etc.) gebruik &quot;Volledig opnieuw indexeren&quot; bovenaan.
          </p>
        </div>
        <button
          onClick={runAllPending}
          disabled={busy || !s || s.pending === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Bezig…" : `Verwerk wachtende PDF's${s ? ` (${s.pending})` : ""}`}
        </button>
      </div>

      {s && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="PDFs totaal" value={s.total_with_pdf} />
          <Stat label="Geëxtraheerd" value={s.extracted_ok} />
          <Stat label="Wachtend" value={s.pending} />
          <Stat label="Gefaald" value={s.failed} />
          <Stat label="Scans" value={s.scanned} />
          <Stat label="Te groot" value={s.too_large} />
          <Stat label="Pagina's totaal" value={s.total_pages} />
          <Stat label="Gem. tekens" value={s.avg_chars} />
        </div>
      )}

      {progress && (
        <div className="mt-3 text-xs text-muted-foreground">{progress}</div>
      )}
      {error && (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {attentionQuery.data && attentionQuery.data.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-sm font-medium text-navy">Aandacht nodig</div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {attentionQuery.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-navy">{a.title || a.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span
                      className={
                        a.extraction_status === "failed"
                          ? "rounded-full bg-destructive/15 px-2 py-0.5 text-destructive"
                          : a.extraction_status === "too_large"
                            ? "rounded-full bg-destructive/10 px-2 py-0.5 text-destructive/80"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-amber-800"
                      }
                    >
                      {a.extraction_status}
                    </span>
                    {a.extraction_error && (
                      <span className="ml-2">{a.extraction_error}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => retryOne(a.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-accent"
                >
                  Opnieuw proberen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

