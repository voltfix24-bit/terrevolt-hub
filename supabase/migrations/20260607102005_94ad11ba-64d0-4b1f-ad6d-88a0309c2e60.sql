-- 1. Permission enum
DO $$ BEGIN
  CREATE TYPE public.app_permission AS ENUM (
    'view_finance','view_planning','manage_users','manage_knowledge',
    'manage_documents','manage_news','view_sensitive_people_data','manage_settings'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_or_admin_perms" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_insert_perms" ON public.user_permissions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_perms" ON public.user_permissions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_perms" ON public.user_permissions
  FOR DELETE TO authenticated USING (public.is_admin());

-- 3. Active flag on user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND active = true);
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user uuid, _perm public.app_permission)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user,'admin')
      OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id=_user AND permission=_perm);
$$;

CREATE OR REPLACE FUNCTION public.can_view_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_active_user() AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'management')
    OR public.has_role(auth.uid(),'finance')
    OR public.has_permission(auth.uid(),'view_finance')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_planning()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_active_user() AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'management')
    OR public.has_role(auth.uid(),'planning')
    OR public.has_permission(auth.uid(),'view_planning')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_sensitive_people()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_active_user() AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'management')
    OR public.has_permission(auth.uid(),'view_sensitive_people_data')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_perm public.app_permission)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_active_user() AND (
    public.has_role(auth.uid(),'admin') OR public.has_permission(auth.uid(),_perm)
  );
$$;

-- 5. Update is_staff/is_admin to require active
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','management') AND active = true
  );
$$;

-- 6. Tighten policies

-- finance_clients: read = can_view_finance; write = admin or has manage perms via finance role
DROP POLICY IF EXISTS staff_read_finance ON public.finance_clients;
DROP POLICY IF EXISTS admin_write_finance ON public.finance_clients;
CREATE POLICY finance_read ON public.finance_clients
  FOR SELECT TO authenticated USING (public.can_view_finance());
CREATE POLICY finance_write ON public.finance_clients
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(),'management') OR public.has_role(auth.uid(),'finance'))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(),'management') OR public.has_role(auth.uid(),'finance'));

-- people_sensitive
DROP POLICY IF EXISTS staff_read_sensitive ON public.people_sensitive;
DROP POLICY IF EXISTS admin_write_sensitive ON public.people_sensitive;
CREATE POLICY sensitive_read ON public.people_sensitive
  FOR SELECT TO authenticated USING (public.can_view_sensitive_people());
CREATE POLICY sensitive_write ON public.people_sensitive
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(),'management'))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(),'management'));

-- Knowledge base (articles/sections/categories/versions): write requires manage_knowledge
DROP POLICY IF EXISTS admin_write_kb_articles ON public.kb_articles;
CREATE POLICY kb_articles_write ON public.kb_articles
  FOR ALL TO authenticated
  USING (public.can_manage('manage_knowledge')) WITH CHECK (public.can_manage('manage_knowledge'));

DROP POLICY IF EXISTS admin_write_kb_sections ON public.kb_sections;
CREATE POLICY kb_sections_write ON public.kb_sections
  FOR ALL TO authenticated
  USING (public.can_manage('manage_knowledge')) WITH CHECK (public.can_manage('manage_knowledge'));

DROP POLICY IF EXISTS admin_write_kb_categories ON public.kb_categories;
CREATE POLICY kb_categories_write ON public.kb_categories
  FOR ALL TO authenticated
  USING (public.can_manage('manage_knowledge')) WITH CHECK (public.can_manage('manage_knowledge'));

DROP POLICY IF EXISTS admin_write_kb_versions ON public.kb_versions;
CREATE POLICY kb_versions_write ON public.kb_versions
  FOR ALL TO authenticated
  USING (public.can_manage('manage_knowledge')) WITH CHECK (public.can_manage('manage_knowledge'));

-- News
DROP POLICY IF EXISTS admin_write_news ON public.news;
CREATE POLICY news_write ON public.news
  FOR ALL TO authenticated
  USING (public.can_manage('manage_news')) WITH CHECK (public.can_manage('manage_news'));

-- Tighten read policies: require active user (not just any authenticated row)
DROP POLICY IF EXISTS auth_read_applications ON public.applications;
CREATE POLICY applications_read ON public.applications
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_departments ON public.departments;
CREATE POLICY departments_read ON public.departments
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_kb_articles ON public.kb_articles;
CREATE POLICY kb_articles_read ON public.kb_articles
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_kb_sections ON public.kb_sections;
CREATE POLICY kb_sections_read ON public.kb_sections
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_kb_categories ON public.kb_categories;
CREATE POLICY kb_categories_read ON public.kb_categories
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_kb_versions ON public.kb_versions;
CREATE POLICY kb_versions_read ON public.kb_versions
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_news ON public.news;
CREATE POLICY news_read ON public.news
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_people ON public.people;
CREATE POLICY people_read ON public.people
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_partner_links ON public.partner_links;
CREATE POLICY partner_links_read ON public.partner_links
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_quick_links ON public.quick_links;
CREATE POLICY quick_links_read ON public.quick_links
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_sharepoint_config ON public.sharepoint_config;
CREATE POLICY sharepoint_config_read ON public.sharepoint_config
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS auth_read_sharepoint_items ON public.sharepoint_items;
CREATE POLICY sharepoint_items_read ON public.sharepoint_items
  FOR SELECT TO authenticated USING (public.is_active_user());

-- Storage policies for kb-documents bucket
DROP POLICY IF EXISTS "kb_documents_read" ON storage.objects;
DROP POLICY IF EXISTS "kb_documents_write" ON storage.objects;
CREATE POLICY "kb_documents_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kb-documents' AND public.is_active_user());
CREATE POLICY "kb_documents_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'kb-documents' AND public.can_manage('manage_documents'))
  WITH CHECK (bucket_id = 'kb-documents' AND public.can_manage('manage_documents'));