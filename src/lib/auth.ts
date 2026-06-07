import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "./userRoles";

export type AppPermission = Database["public"]["Enums"]["app_permission"];

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      qc.invalidateQueries({ queryKey: ["current-role"] });
      qc.invalidateQueries({ queryKey: ["current-permissions"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return { session, user: session?.user ?? null, loading };
}

export type CurrentRole = {
  role: AppRole;
  display_name: string;
  active: boolean;
} | null;

export function useCurrentRole(user: User | null) {
  return useQuery({
    queryKey: ["current-role", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CurrentRole> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, display_name, active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as CurrentRole) ?? null;
    },
  });
}

export function useCurrentPermissions(user: User | null) {
  return useQuery({
    queryKey: ["current-permissions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppPermission[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.permission as AppPermission);
    },
  });
}

export type Perms = {
  ready: boolean;
  user: User | null;
  role: AppRole | null;
  active: boolean;
  displayName: string;
  permissions: AppPermission[];
  isAdmin: boolean;
  isManagement: boolean;
  hasRole: (...roles: AppRole[]) => boolean;
  hasPermission: (perm: AppPermission) => boolean;
  canViewFinance: boolean;
  canViewPlanning: boolean;
  canViewSensitivePeople: boolean;
  canManage: (perm: AppPermission) => boolean;
};

export function usePerms(): Perms {
  const { user, loading } = useSession();
  const { data: role, isLoading: roleLoading } = useCurrentRole(user);
  const { data: perms, isLoading: permsLoading } = useCurrentPermissions(user);

  const r = role?.role ?? null;
  const active = role?.active ?? false;
  const permissions = perms ?? [];
  const isAdmin = r === "admin" && active;
  const isManagement = r === "management" && active;

  const hasRole = (...roles: AppRole[]) => !!r && active && roles.includes(r);
  const hasPermission = (perm: AppPermission) => permissions.includes(perm);
  const canManage = (perm: AppPermission) => isAdmin || (active && hasPermission(perm));

  const ready =
    !loading &&
    (user ? !roleLoading && !permsLoading : true);

  return {
    ready,
    user,
    role: r,
    active,
    displayName: role?.display_name ?? "",
    permissions,
    isAdmin,
    isManagement,
    hasRole,
    hasPermission,
    canViewFinance:
      active && (isAdmin || isManagement || r === "finance" || hasPermission("view_finance")),
    canViewPlanning:
      active && (isAdmin || isManagement || r === "planning" || hasPermission("view_planning")),
    canViewSensitivePeople:
      active && (isAdmin || isManagement || hasPermission("view_sensitive_people_data")),
    canManage,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
