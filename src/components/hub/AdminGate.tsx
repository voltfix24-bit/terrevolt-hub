import { PermissionGate } from "./PermissionGate";

/**
 * Thin compatibility wrapper. Prefer `<PermissionGate roles={["admin"]} />`
 * directly in new code. The underlying gate already enforces
 * `is_active_user()` via Supabase RLS.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  return <PermissionGate roles={["admin"]}>{children}</PermissionGate>;
}
