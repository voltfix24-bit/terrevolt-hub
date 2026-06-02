import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type UserRoleInput = Database["public"]["Tables"]["user_roles"]["Insert"];

export const APP_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Volledige beheerrechten" },
  { value: "management", label: "Management", description: "Directie en management" },
  { value: "kantoor", label: "Kantoor", description: "Werkvoorbereiding en administratie" },
  { value: "monteur", label: "Monteur", description: "Buitendienst" },
  { value: "zzper", label: "ZZP'er", description: "Externe inhuur" },
];

export function roleLabel(role: AppRole): string {
  return APP_ROLES.find((r) => r.value === role)?.label ?? role;
}

const KEY = ["user_roles"] as const;

export function useUserRoles() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as UserRole[];
    },
  });
}

export function useUserRoleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });
  return {
    add: useMutation({
      mutationFn: async (input: Omit<UserRoleInput, "id">) => {
        const { error } = await supabase.from("user_roles").insert(input);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<UserRole> }) => {
        const { error } = await supabase.from("user_roles").update(patch).eq("id", id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("user_roles").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
  };
}
