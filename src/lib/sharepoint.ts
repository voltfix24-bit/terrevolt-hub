import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DocVisibility } from "@/lib/knowledge";

export type SharePointKind = "link" | "folder";

export type SharePointItem = {
  id: string;
  kind: SharePointKind;
  name: string;
  description: string;
  url: string;
  icon: string;
  favorite: boolean;
  last_opened_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  visibility: DocVisibility;
};

export type SharePointItemInput = Omit<
  SharePointItem,
  "id" | "created_at" | "updated_at" | "sort_order" | "last_opened_at"
> & {
  sort_order?: number;
};

export type SharePointConfig = { base_url: string };

const ITEMS = "sharepoint_items";
const CONFIG = "sharepoint_config";
const KEY = ["sharepoint", "items"] as const;
const CFG_KEY = ["sharepoint", "config"] as const;

export function useSharePointConfig() {
  return useQuery({
    queryKey: CFG_KEY,
    queryFn: async (): Promise<SharePointConfig> => {
      const { data, error } = await supabase
        .from(CONFIG)
        .select("base_url")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return { base_url: (data?.base_url as string) ?? "" };
    },
  });
}

export function useUpdateSharePointConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (base_url: string) => {
      const { error } = await supabase
        .from(CONFIG)
        .upsert({ id: true, base_url }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CFG_KEY }),
  });
}

export function useSharePointItems() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<SharePointItem[]> => {
      const { data, error } = await supabase
        .from(ITEMS)
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SharePointItem[];
    },
  });
}

export function useSharePointLinks() {
  const q = useSharePointItems();
  return { ...q, data: (q.data ?? []).filter((i) => i.kind === "link") };
}

export function useSharePointFolders() {
  const q = useSharePointItems();
  return { ...q, data: (q.data ?? []).filter((i) => i.kind === "folder") };
}

export function useRecentSharePointLinks(limit = 6) {
  const q = useSharePointItems();
  const data = (q.data ?? [])
    .filter((i) => i.kind === "link")
    .slice()
    .sort((a, b) => {
      const ta = a.last_opened_at ? new Date(a.last_opened_at).getTime() : 0;
      const tb = b.last_opened_at ? new Date(b.last_opened_at).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return a.sort_order - b.sort_order;
    })
    .slice(0, limit);
  return { ...q, data };
}

export function useFavoriteSharePointFolders() {
  const q = useSharePointItems();
  return {
    ...q,
    data: (q.data ?? []).filter((i) => i.kind === "folder" && i.favorite),
  };
}

export function useFavoriteSharePointLinks() {
  const q = useSharePointItems();
  return {
    ...q,
    data: (q.data ?? []).filter((i) => i.kind === "link" && i.favorite),
  };
}

export function useSharePointMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const add = useMutation({
    mutationFn: async (input: SharePointItemInput) => {
      const { data: maxRow } = await supabase
        .from(ITEMS)
        .select("sort_order")
        .eq("kind", input.kind)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = ((maxRow?.sort_order as number | undefined) ?? 0) + 10;
      const { error } = await supabase.from(ITEMS).insert({ ...input, sort_order: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SharePointItem> }) => {
      const { error } = await supabase.from(ITEMS).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(ITEMS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async ({ items }: { items: SharePointItem[] }) => {
      await Promise.all(
        items.map((it, i) =>
          supabase.from(ITEMS).update({ sort_order: (i + 1) * 10 }).eq("id", it.id),
        ),
      );
    },
    onSuccess: invalidate,
  });

  const touch = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from(ITEMS)
        .update({ last_opened_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: invalidate,
  });

  return { add, update, remove, reorder, touch };
}
