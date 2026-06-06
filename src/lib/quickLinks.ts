import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type QuickLink = {
  id: string;
  name: string;
  href: string;
  icon: string;
  active: boolean;
  sort_order: number;
};

export type QuickLinkInput = Omit<QuickLink, "id" | "sort_order"> & {
  sort_order?: number;
};

const TABLE = "quick_links" as const;
const KEY = ["quick_links"] as const;

export function useQuickLinks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<QuickLink[]> => {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuickLink[];
    },
  });
}

export function useActiveQuickLinks() {
  const q = useQuickLinks();
  return { ...q, data: (q.data ?? []).filter((l) => l.active) };
}

export function useQuickLinkMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const add = useMutation({
    mutationFn: async (input: QuickLinkInput) => {
      const { data: maxRow } = await supabase
        .from(TABLE)
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = ((maxRow?.sort_order as number | undefined) ?? 0) + 10;
      const { error } = await supabase.from(TABLE).insert({ ...input, sort_order: next });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<QuickLink> }) => {
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
    mutationFn: async ({ items }: { items: QuickLink[] }) => {
      await Promise.all(
        items.map((it, idx) =>
          supabase.from(TABLE).update({ sort_order: idx }).eq("id", it.id),
        ),
      );
    },
    onSuccess: invalidate,
  });

  return { add, update, remove, reorder };
}
