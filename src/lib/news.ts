import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NewsArticle = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  cover_image: string;
  publish_date: string; // ISO date (yyyy-mm-dd)
  author: string;
  important: boolean;
  archived: boolean;
  sort_order: number;
};

export type NewsInput = Omit<NewsArticle, "id" | "sort_order"> & {
  sort_order?: number;
};

const TABLE = "news";
const KEY = ["news"] as const;

async function fetchNews(): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("important", { ascending: false })
    .order("publish_date", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NewsArticle[];
}

export function useNews() {
  return useQuery({ queryKey: KEY, queryFn: fetchNews });
}

export function usePublishedNews() {
  const q = useNews();
  return { ...q, data: (q.data ?? []).filter((n) => !n.archived) };
}

export function useNewsMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const add = useMutation({
    mutationFn: async (input: NewsInput) => {
      const { error } = await supabase.from(TABLE).insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NewsArticle> }) => {
      const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async ({ items }: { items: NewsArticle[] }) => {
      await Promise.all(
        items.map((n, i) =>
          supabase.from(TABLE).update({ sort_order: (i + 1) * 10 }).eq("id", n.id),
        ),
      );
    },
    onSuccess: invalidate,
  });

  return { add, update, remove, reorder };
}

export function formatNewsDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
