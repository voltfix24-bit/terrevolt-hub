import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DocVisibility } from "@/lib/knowledge";

export const APP_CATEGORIES = [
  "Operationeel",
  "Administratie",
  "Rapportage",
  "Externe systemen",
  "Overig",
] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];

export type AppAccent = "brand" | "pastel" | "lime" | "navy";

export type Application = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AppCategory;
  url: string;
  new_tab: boolean;
  featured: boolean;
  active: boolean;
  accent: AppAccent;
  sort_order: number;
};

export type ApplicationInput = Omit<Application, "id" | "sort_order"> & {
  sort_order?: number;
};

const TABLE = "applications";
const KEY = ["applications"] as const;

async function fetchApplications(): Promise<Application[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Application[];
}

export function useApplications() {
  return useQuery({ queryKey: KEY, queryFn: fetchApplications });
}

export function useActiveApplications() {
  const q = useApplications();
  return {
    ...q,
    data: (q.data ?? []).filter((a) => a.active),
  };
}

export function useAppMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const add = useMutation({
    mutationFn: async (input: ApplicationInput) => {
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
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Application> }) => {
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
    mutationFn: async ({ items }: { items: Application[] }) => {
      await Promise.all(
        items.map((a, i) =>
          supabase.from(TABLE).update({ sort_order: (i + 1) * 10 }).eq("id", a.id),
        ),
      );
    },
    onSuccess: invalidate,
  });

  return { add, update, remove, reorder };
}
