import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type DepartmentInput = Database["public"]["Tables"]["departments"]["Insert"];

const KEY = ["departments"] as const;

export function useDepartments() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Department[];
    },
  });
}

export function useDepartmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });
  return {
    add: useMutation({
      mutationFn: async (input: Omit<DepartmentInput, "id">) => {
        const { error } = await supabase.from("departments").insert(input);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<Department> }) => {
        const { error } = await supabase.from("departments").update(patch).eq("id", id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("departments").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
  };
}
