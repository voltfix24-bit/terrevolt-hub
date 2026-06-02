import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./userRoles";

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
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return { session, user: session?.user ?? null, loading };
}

export function useCurrentRole(user: User | null) {
  return useQuery({
    queryKey: ["current-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { role: AppRole; display_name: string } | null;
    },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
