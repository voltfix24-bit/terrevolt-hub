-- ============================================================================
-- RLS hardening migration
--
-- BOOTSTRAP FIRST ADMIN:
--   Run this once via service role (Supabase SQL editor) AFTER a user has signed up:
--     INSERT INTO public.user_roles (user_id, role, display_name, email)
--     VALUES ('<auth-user-uuid>', 'admin', 'Naam', 'email@domein.nl')
--     ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
--   Daarna kunnen admins andere rollen toewijzen via de Instellingen-pagina.
-- ============================================================================

-- 1. Helper functions ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','management')
  );
$$;

-- 2. Drop ALL existing "Public ..." / "Anyone ..." policies ------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Revoke anon writes everywhere in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', r.tablename);
  END LOOP;
END $$;

-- 3. Standard pattern: auth read, admin write -------------------------------
-- applications
CREATE POLICY "auth_read_applications" ON public.applications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_applications" ON public.applications
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- news
CREATE POLICY "auth_read_news" ON public.news
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_news" ON public.news
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- kb_sections
CREATE POLICY "auth_read_kb_sections" ON public.kb_sections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_kb_sections" ON public.kb_sections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- kb_categories
CREATE POLICY "auth_read_kb_categories" ON public.kb_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_kb_categories" ON public.kb_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- kb_articles
CREATE POLICY "auth_read_kb_articles" ON public.kb_articles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_kb_articles" ON public.kb_articles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- kb_versions
CREATE POLICY "auth_read_kb_versions" ON public.kb_versions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_kb_versions" ON public.kb_versions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sharepoint_config
CREATE POLICY "auth_read_sharepoint_config" ON public.sharepoint_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_sharepoint_config" ON public.sharepoint_config
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sharepoint_items
CREATE POLICY "auth_read_sharepoint_items" ON public.sharepoint_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_sharepoint_items" ON public.sharepoint_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- departments
CREATE POLICY "auth_read_departments" ON public.departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_departments" ON public.departments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- partner_links
CREATE POLICY "auth_read_partner_links" ON public.partner_links
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_partner_links" ON public.partner_links
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- people (read-all for staff, write admin-only)
CREATE POLICY "auth_read_people" ON public.people
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_people" ON public.people
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. user_roles --------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE POLICY "read_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_insert_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND user_id <> auth.uid());

CREATE POLICY "admin_update_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin() AND user_id <> auth.uid())
  WITH CHECK (public.is_admin() AND user_id <> auth.uid());

CREATE POLICY "admin_delete_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin() AND user_id <> auth.uid());

-- 5. finance_clients ---------------------------------------------------------
CREATE POLICY "staff_read_finance" ON public.finance_clients
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "admin_write_finance" ON public.finance_clients
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. vraagbaak_* -------------------------------------------------------------
-- questions
CREATE POLICY "auth_read_vb_questions" ON public.vraagbaak_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_vb_questions" ON public.vraagbaak_questions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_vb_questions" ON public.vraagbaak_questions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_vb_questions" ON public.vraagbaak_questions
  FOR DELETE TO authenticated USING (public.is_admin());

-- sources
CREATE POLICY "auth_read_vb_sources" ON public.vraagbaak_sources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_vb_sources" ON public.vraagbaak_sources
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_vb_sources" ON public.vraagbaak_sources
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_vb_sources" ON public.vraagbaak_sources
  FOR DELETE TO authenticated USING (public.is_admin());

-- feedback + saved: per-user ownership
ALTER TABLE public.vraagbaak_feedback ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.vraagbaak_saved    ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

CREATE POLICY "own_feedback_select" ON public.vraagbaak_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own_feedback_insert" ON public.vraagbaak_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "own_feedback_update" ON public.vraagbaak_feedback
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own_feedback_delete" ON public.vraagbaak_feedback
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "own_saved_select" ON public.vraagbaak_saved
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own_saved_insert" ON public.vraagbaak_saved
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "own_saved_update" ON public.vraagbaak_saved
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own_saved_delete" ON public.vraagbaak_saved
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 7. people_sensitive (split off emergency contact) --------------------------
CREATE TABLE IF NOT EXISTS public.people_sensitive (
  person_id uuid PRIMARY KEY REFERENCES public.people(id) ON DELETE CASCADE,
  emergency_contact text NOT NULL DEFAULT '',
  notes_admin text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people_sensitive TO authenticated;
GRANT ALL ON public.people_sensitive TO service_role;
ALTER TABLE public.people_sensitive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_sensitive" ON public.people_sensitive
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "admin_write_sensitive" ON public.people_sensitive
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER set_people_sensitive_updated_at
  BEFORE UPDATE ON public.people_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Migrate existing emergency_contact data
INSERT INTO public.people_sensitive (person_id, emergency_contact)
SELECT id, emergency_contact FROM public.people WHERE emergency_contact <> ''
ON CONFLICT (person_id) DO NOTHING;

ALTER TABLE public.people DROP COLUMN IF EXISTS emergency_contact;
ALTER TABLE public.people DROP COLUMN IF EXISTS emergency_admin_only;

-- 8. Storage bucket kb-documents --------------------------------------------
DROP POLICY IF EXISTS "Public read kb-documents" ON storage.objects;
DROP POLICY IF EXISTS "Public insert kb-documents" ON storage.objects;
DROP POLICY IF EXISTS "Public update kb-documents" ON storage.objects;
DROP POLICY IF EXISTS "Public delete kb-documents" ON storage.objects;

CREATE POLICY "auth_read_kb" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kb-documents');
CREATE POLICY "admin_insert_kb" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kb-documents' AND public.is_admin());
CREATE POLICY "admin_update_kb" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kb-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'kb-documents' AND public.is_admin());
CREATE POLICY "admin_delete_kb" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kb-documents' AND public.is_admin());
