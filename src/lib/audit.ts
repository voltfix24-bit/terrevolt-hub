import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "finance.view"
  | "planning.view"
  | "document.open"
  | "document.download"
  | "settings.update"
  | "role.change"
  | "permission.change"
  | "user.activate"
  | "user.deactivate"
  | string;

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Fire-and-forget audit log; failures are swallowed (don't block UX). */
export async function logAudit(
  action: AuditAction,
  opts: {
    targetType?: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await supabase.rpc("log_audit", {
      _action: action,
      _target_type: opts.targetType ?? undefined,
      _target_id: opts.targetId ?? undefined,
      _metadata: (opts.metadata as never) ?? {},
    });
  } catch {

    /* ignore */
  }
}

export function useAuditLogs(limit = 200) {
  return useQuery({
    queryKey: ["audit_logs", limit],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });
}
