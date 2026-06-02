import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type KbCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
};

export type KbAttachment = { label: string; url: string };

export type KbArticle = {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  content: string;
  attachments: KbAttachment[];
  related_ids: string[];
  author: string;
  sort_order: number;
  updated_at: string;
  created_at: string;
};

export type KbCategoryInput = Omit<KbCategory, "id" | "sort_order"> & {
  sort_order?: number;
};
export type KbArticleInput = Omit<
  KbArticle,
  "id" | "sort_order" | "updated_at" | "created_at"
> & { sort_order?: number };

const CATS_KEY = ["kb_categories"] as const;
const ARTS_KEY = ["kb_articles"] as const;

/* ----- categories ----- */

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

/* ----- articles ----- */

async function fetchArticles(): Promise<KbArticle[]> {
  const { data, error } = await supabase
    .from("kb_articles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...(r as KbArticle),
    attachments: ((r as { attachments: unknown }).attachments as KbAttachment[]) ?? [],
    related_ids: ((r as { related_ids: unknown }).related_ids as string[]) ?? [],
  }));
}

export function useKbArticles() {
  return useQuery({ queryKey: ARTS_KEY, queryFn: fetchArticles });
}

export function useKbArticleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ARTS_KEY });

  const add = useMutation({
    mutationFn: async (input: KbArticleInput) => {
      const { error } = await supabase.from("kb_articles").insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<KbArticle> }) => {
      const { error } = await supabase.from("kb_articles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function formatKbDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
