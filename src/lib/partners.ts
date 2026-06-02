import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PartnerLink = Database["public"]["Tables"]["partner_links"]["Row"];
export type PartnerLinkInput = Database["public"]["Tables"]["partner_links"]["Insert"];

const KEY = ["partner_links"] as const;

export function usePartnerLinks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_links")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PartnerLink[];
    },
  });
}

export function useActivePartnerLinks() {
  const q = usePartnerLinks();
  return { ...q, data: (q.data ?? []).filter((p) => p.active) };
}

export function usePartnerLinkMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });
  const add = useMutation({
    mutationFn: async (input: Omit<PartnerLinkInput, "id">) => {
      const { error } = await supabase.from("partner_links").insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PartnerLink> }) => {
      const { error } = await supabase.from("partner_links").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: async ({ items }: { items: PartnerLink[] }) => {
      await Promise.all(
        items.map((it, idx) =>
          supabase.from("partner_links").update({ sort_order: idx }).eq("id", it.id),
        ),
      );
    },
    onSuccess: invalidate,
  });
  return { add, update, remove, reorder };
}

export const PARTNER_CATEGORIES = [
  "Opdrachtgever",
  "Leverancier",
  "Onderaannemer",
  "Overig",
] as const;
