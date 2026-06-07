import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ============================================================
 * Types
 * ============================================================ */

export type KbSection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  sort_order: number;
};

export type KbCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
};

export type KbAttachment = { label: string; url: string };

export type KbStatus = "active" | "draft" | "expired" | "archived";

export const KB_STATUSES: KbStatus[] = ["active", "draft", "expired", "archived"];

export type DocVisibility = "all_staff" | "management" | "finance" | "planning" | "admin_only";

export const DOC_VISIBILITIES: { value: DocVisibility; label: string; hint: string }[] = [
  { value: "all_staff", label: "Iedereen (medewerkers)", hint: "Alle ingelogde medewerkers" },
  { value: "management", label: "Management", hint: "Admin + management" },
  { value: "finance", label: "Finance", hint: "Admin, management, finance of view_finance" },
  { value: "planning", label: "Planning", hint: "Admin, management, planning of view_planning" },
  { value: "admin_only", label: "Alleen admin", hint: "Uitsluitend admin-rol" },
];

export const KB_DOCUMENT_TYPES = [
  "wiki",
  "pdf",
  "word",
  "excel",
  "sharepoint",
  "link",
  "afbeelding",
  "overig",
] as const;
export type KbDocumentType = (typeof KB_DOCUMENT_TYPES)[number];


export type KbArticle = {
  id: string;
  section_id: string | null;
  category_id: string | null;
  slug: string;
  title: string;
  summary: string;
  content: string;
  important_notes: string;
  owner: string;
  author: string;
  client: string;
  document_type: KbDocumentType;
  version: string;
  document_date: string | null;
  valid_from: string | null;
  valid_until: string | null;
  tags: string[];
  file_url: string;
  file_name: string;
  file_size: number;
  file_path: string;
  extraction_status: KbExtractionStatus;
  extraction_error: string;
  extracted_page_count: number;
  extracted_at: string | null;
  external_url: string;
  attachments: KbAttachment[];
  related_ids: string[];
  status: KbStatus;
  visibility: DocVisibility;

  sort_order: number;
  updated_at: string;
  created_at: string;
};

export type KbExtractionStatus =
  | "not_applicable"
  | "pending"
  | "ok"
  | "scanned"
  | "failed"
  | "too_large";

export type KbArticleInput = Omit<
  KbArticle,
  "id" | "sort_order" | "updated_at" | "created_at"
> & { sort_order?: number };

export type KbVersion = {
  id: string;
  article_id: string;
  version: string;
  title: string;
  summary: string;
  content: string;
  file_url: string;
  file_name: string;
  external_url: string;
  author: string;
  note: string;
  document_date: string | null;
  created_at: string;
};

export type KbCategoryInput = Omit<KbCategory, "id" | "sort_order"> & {
  sort_order?: number;
};

export type KbSectionInput = Omit<KbSection, "id" | "sort_order"> & {
  sort_order?: number;
};

const SECTIONS_KEY = ["kb_sections"] as const;
const CATS_KEY = ["kb_categories"] as const;
const ARTS_KEY = ["kb_articles"] as const;
const VERSIONS_KEY = (id: string) => ["kb_versions", id] as const;

/* ============================================================
 * Sections
 * ============================================================ */

async function fetchSections(): Promise<KbSection[]> {
  const { data, error } = await supabase
    .from("kb_sections")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as KbSection[];
}

export function useKbSections() {
  return useQuery({ queryKey: SECTIONS_KEY, queryFn: fetchSections });
}

export function useKbSectionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: SECTIONS_KEY });
  const add = useMutation({
    mutationFn: async (input: KbSectionInput) => {
      const { data: maxRow } = await supabase
        .from("kb_sections")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = ((maxRow?.sort_order as number | undefined) ?? 0) + 10;
      const { error } = await supabase
        .from("kb_sections")
        .insert({ ...input, sort_order: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<KbSection> }) => {
      const { error } = await supabase.from("kb_sections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kb_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, update, remove };
}

/* ============================================================
 * Categories (sub-grouping within a section, kept for compat)
 * ============================================================ */

async function fetchCategories(): Promise<KbCategory[]> {
  const { data, error } = await supabase
    .from("kb_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as KbCategory[];
}

export function useKbCategories() {
  return useQuery({ queryKey: CATS_KEY, queryFn: fetchCategories });
}

export function useKbCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: CATS_KEY });
  const add = useMutation({
    mutationFn: async (input: KbCategoryInput) => {
      const { data: maxRow } = await supabase
        .from("kb_categories")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = ((maxRow?.sort_order as number | undefined) ?? 0) + 10;
      const { error } = await supabase
        .from("kb_categories")
        .insert({ ...input, sort_order: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<KbCategory> }) => {
      const { error } = await supabase.from("kb_categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kb_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: async ({ items }: { items: KbCategory[] }) => {
      await Promise.all(
        items.map((c, i) =>
          supabase.from("kb_categories").update({ sort_order: (i + 1) * 10 }).eq("id", c.id),
        ),
      );
    },
    onSuccess: invalidate,
  });
  return { add, update, remove, reorder };
}

/* ============================================================
 * Articles (knowledge items)
 * ============================================================ */

function normalizeArticle(r: Record<string, unknown>): KbArticle {
  return {
    id: String(r.id),
    section_id: (r.section_id as string | null) ?? null,
    category_id: (r.category_id as string | null) ?? null,
    slug: (r.slug as string) ?? "",
    title: (r.title as string) ?? "",
    summary: (r.summary as string) ?? "",
    content: (r.content as string) ?? "",
    important_notes: (r.important_notes as string) ?? "",
    owner: (r.owner as string) ?? "",
    author: (r.author as string) ?? "",
    client: (r.client as string) ?? "",
    document_type: ((r.document_type as KbDocumentType) ?? "wiki"),
    version: (r.version as string) ?? "1.0",
    document_date: (r.document_date as string | null) ?? null,
    valid_from: (r.valid_from as string | null) ?? null,
    valid_until: (r.valid_until as string | null) ?? null,
    tags: (r.tags as string[]) ?? [],
    file_url: (r.file_url as string) ?? "",
    file_name: (r.file_name as string) ?? "",
    file_size: Number(r.file_size ?? 0),
    file_path: (r.file_path as string) ?? "",
    extraction_status: ((r.extraction_status as KbExtractionStatus) ?? "not_applicable"),
    extraction_error: (r.extraction_error as string) ?? "",
    extracted_page_count: Number(r.extracted_page_count ?? 0),
    extracted_at: (r.extracted_at as string | null) ?? null,
    external_url: (r.external_url as string) ?? "",
    attachments: (r.attachments as KbAttachment[]) ?? [],
    related_ids: (r.related_ids as string[]) ?? [],
    status: ((r.status as KbStatus) ?? "active"),
    visibility: ((r.visibility as DocVisibility) ?? "all_staff"),

    sort_order: Number(r.sort_order ?? 0),
    updated_at: (r.updated_at as string) ?? "",
    created_at: (r.created_at as string) ?? "",
  };
}

async function fetchArticles(): Promise<KbArticle[]> {
  const { data, error } = await supabase
    .from("kb_articles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalizeArticle(r as Record<string, unknown>));
}

export function useKbArticles() {
  return useQuery({ queryKey: ARTS_KEY, queryFn: fetchArticles });
}

export function useKbArticleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ARTS_KEY });

  const add = useMutation({
    mutationFn: async (input: KbArticleInput) => {
      const { data, error } = await supabase
        .from("kb_articles")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return normalizeArticle(data as Record<string, unknown>);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
      versionNote,
    }: {
      id: string;
      patch: Partial<KbArticle>;
      versionNote?: string;
    }) => {
      // Snapshot previous version if title/content/file changed and version field changed
      if (versionNote || patch.version || patch.content || patch.file_url) {
        const { data: prev } = await supabase
          .from("kb_articles")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (prev) {
          await supabase.from("kb_versions").insert({
            article_id: id,
            version: (prev as Record<string, unknown>).version as string,
            title: (prev as Record<string, unknown>).title as string,
            summary: ((prev as Record<string, unknown>).summary as string) ?? "",
            content: ((prev as Record<string, unknown>).content as string) ?? "",
            file_url: ((prev as Record<string, unknown>).file_url as string) ?? "",
            file_name: ((prev as Record<string, unknown>).file_name as string) ?? "",
            external_url: ((prev as Record<string, unknown>).external_url as string) ?? "",
            author: ((prev as Record<string, unknown>).author as string) ?? "",
            note: versionNote ?? "",
            document_date: ((prev as Record<string, unknown>).document_date as string | null) ?? null,
          });
        }
      }
      const { error } = await supabase.from("kb_articles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["kb_versions"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kb_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

/* ============================================================
 * Versions
 * ============================================================ */

export function useKbVersions(articleId: string | null | undefined) {
  return useQuery({
    queryKey: VERSIONS_KEY(articleId ?? ""),
    enabled: !!articleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kb_versions")
        .select("*")
        .eq("article_id", articleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KbVersion[];
    },
  });
}

/* ============================================================
 * File upload (kb-documents bucket)
 * ============================================================ */

export async function uploadKbDocument(file: File): Promise<{
  url: string;
  path: string;
  name: string;
  size: number;
}> {
  const ext = file.name.split(".").pop() ?? "bin";
  const safe = slugify(file.name.replace(/\.[^.]+$/, "")) || "document";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}.${ext}`;
  const { error } = await supabase.storage
    .from("kb-documents")
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
  if (error) throw error;
  const { data: signed } = await supabase.storage
    .from("kb-documents")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5y
  return {
    url: signed?.signedUrl ?? "",
    path,
    name: file.name,
    size: file.size,
  };
}

/* ============================================================
 * Helpers / derived selectors
 * ============================================================ */

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function formatKbDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export function isExpired(a: KbArticle, now: Date = new Date()): boolean {
  if (a.status === "expired" || a.status === "archived") return a.status === "expired";
  if (!a.valid_until) return false;
  const d = new Date(a.valid_until);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

export function isExpiringSoon(a: KbArticle, days = 30, now: Date = new Date()): boolean {
  if (!a.valid_until || isExpired(a, now)) return false;
  const d = new Date(a.valid_until);
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= days && diff >= 0;
}

export function effectiveStatus(a: KbArticle): KbStatus {
  if (a.status === "archived") return "archived";
  if (a.status === "draft") return "draft";
  if (isExpired(a)) return "expired";
  return "active";
}

export function statusLabel(s: KbStatus): string {
  switch (s) {
    case "active":
      return "Actief";
    case "draft":
      return "Concept";
    case "expired":
      return "Verlopen";
    case "archived":
      return "Gearchiveerd";
  }
}

export function statusColor(s: KbStatus): string {
  switch (s) {
    case "active":
      return "bg-brand/15 text-brand";
    case "draft":
      return "bg-muted text-muted-foreground";
    case "expired":
      return "bg-destructive/15 text-destructive";
    case "archived":
      return "bg-navy/10 text-navy/70";
  }
}

export function documentTypeIcon(t: KbDocumentType): string {
  switch (t) {
    case "pdf":
      return "file-text";
    case "word":
      return "file-text";
    case "excel":
      return "sheet";
    case "sharepoint":
      return "cloud";
    case "link":
      return "link";
    case "afbeelding":
      return "image";
    case "wiki":
      return "book-open";
    default:
      return "file";
  }
}

export function documentTypeLabel(t: KbDocumentType): string {
  switch (t) {
    case "pdf":
      return "PDF";
    case "word":
      return "Word";
    case "excel":
      return "Excel";
    case "sharepoint":
      return "SharePoint";
    case "link":
      return "Externe link";
    case "afbeelding":
      return "Afbeelding";
    case "wiki":
      return "Wiki-artikel";
    default:
      return "Overig";
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function emptyArticleInput(sectionId?: string): KbArticleInput {
  return {
    section_id: sectionId ?? null,
    category_id: null,
    slug: "",
    title: "",
    summary: "",
    content: "",
    important_notes: "",
    owner: "",
    author: "",
    client: "",
    document_type: "wiki",
    version: "1.0",
    document_date: null,
    valid_from: null,
    valid_until: null,
    tags: [],
    file_url: "",
    file_name: "",
    file_size: 0,
    file_path: "",
    extraction_status: "not_applicable",
    extraction_error: "",
    extracted_page_count: 0,
    extracted_at: null,
    external_url: "",
    attachments: [],
    related_ids: [],
    status: "active",
    visibility: "all_staff",

  };
}
