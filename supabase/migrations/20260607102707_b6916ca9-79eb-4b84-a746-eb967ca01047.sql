
-- Allow manage_users permission holders (not only admins) to manage user_roles & user_permissions

DROP POLICY IF EXISTS admin_insert_roles ON public.user_roles;
DROP POLICY IF EXISTS admin_update_roles ON public.user_roles;
DROP POLICY IF EXISTS admin_delete_roles ON public.user_roles;

CREATE POLICY user_roles_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage('manage_users'));

CREATE POLICY user_roles_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.can_manage('manage_users') AND user_id <> auth.uid())
  WITH CHECK (public.can_manage('manage_users') AND user_id <> auth.uid());

CREATE POLICY user_roles_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.can_manage('manage_users') AND user_id <> auth.uid());

DROP POLICY IF EXISTS admin_insert_perms ON public.user_permissions;
DROP POLICY IF EXISTS admin_update_perms ON public.user_permissions;
DROP POLICY IF EXISTS admin_delete_perms ON public.user_permissions;

CREATE POLICY user_perms_insert ON public.user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage('manage_users'));

CREATE POLICY user_perms_update ON public.user_permissions
  FOR UPDATE TO authenticated
  USING (public.can_manage('manage_users'))
  WITH CHECK (public.can_manage('manage_users'));

CREATE POLICY user_perms_delete ON public.user_permissions
  FOR DELETE TO authenticated
  USING (public.can_manage('manage_users'));
