-- Tighten insert policies: require user_id = auth.uid() explicitly.
DROP POLICY IF EXISTS "own_feedback_insert" ON public.vraagbaak_feedback;
DROP POLICY IF EXISTS "own_saved_insert" ON public.vraagbaak_saved;

CREATE POLICY "own_feedback_insert" ON public.vraagbaak_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_saved_insert" ON public.vraagbaak_saved
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lock down SECURITY DEFINER helpers: only authenticated may call them.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
