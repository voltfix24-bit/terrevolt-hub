import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type AppPermission = Database["public"]["Enums"]["app_permission"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type UserRoleInput = Database["public"]["Tables"]["user_roles"]["Insert"];
export type UserPermissionRow = Database["public"]["Tables"]["user_permissions"]["Row"];

export const APP_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Volledige beheerrechten" },
  { value: "management", label: "Management", description: "Directie en management" },
  { value: "finance", label: "Finance", description: "Financiële administratie" },
  { value: "planning", label: "Planning", description: "Planning en werkvoorbereiding" },
  { value: "kantoor", label: "Kantoor", description: "Administratie en backoffice" },
  { value: "monteur", label: "Monteur", description: "Buitendienst" },
];

export const APP_PERMISSIONS: { value: AppPermission; label: string; description: string }[] = [
  { value: "view_finance", label: "Finance bekijken", description: "Toegang tot finance wiki en facturatie" },
  { value: "view_planning", label: "Planning bekijken", description: "Toegang tot planningsmodule" },
  { value: "manage_users", label: "Gebruikersbeheer", description: "Gebruikers en rechten beheren" },
  { value: "manage_knowledge", label: "Kennisbank beheren", description: "KB-artikelen, secties en categorieën" },
  { value: "manage_documents", label: "Documenten beheren", description: "Uploaden en verwijderen van documenten" },
  { value: "manage_news", label: "Nieuws beheren", description: "Nieuwsberichten plaatsen en wijzigen" },
  { value: "view_sensitive_people_data", label: "Gevoelige persoonsgegevens", description: "Toegang tot privé contactgegevens" },
  { value: "manage_settings", label: "Instellingen beheren", description: "Algemene applicatie-instellingen" },
];

export function roleLabel(role: AppRole): string {
  return APP_ROLES.find((r) => r.value === role)?.label ?? role;
}

export function permissionLabel(perm: AppPermission): string {
  return APP_PERMISSIONS.find((p) => p.value === perm)?.label ?? perm;
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

/* ---------- user_permissions ---------- */
const PKEY = ["user_permissions"] as const;

export function useAllUserPermissions() {
  return useQuery({
    queryKey: PKEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("user_id, permission");
      if (error) throw error;
      return (data ?? []) as Pick<UserPermissionRow, "user_id" | "permission">[];
    },
  });
}

export function useUserPermissionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: PKEY });
    qc.invalidateQueries({ queryKey: ["current-permissions"] });
  };
  return {
    grant: useMutation({
      mutationFn: async ({ user_id, permission }: { user_id: string; permission: AppPermission }) => {
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id, permission });
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      },
      onSuccess: invalidate,
    }),
    revoke: useMutation({
      mutationFn: async ({ user_id, permission }: { user_id: string; permission: AppPermission }) => {
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", user_id)
          .eq("permission", permission);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
  };
}

