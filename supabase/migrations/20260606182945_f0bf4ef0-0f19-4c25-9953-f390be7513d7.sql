BEGIN;

CREATE TABLE public.quick_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  href        text NOT NULL DEFAULT 'https://',
  icon        text NOT NULL DEFAULT 'link',
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_links TO authenticated;
GRANT ALL ON public.quick_links TO service_role;

ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_quick_links" ON public.quick_links
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_quick_links" ON public.quick_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER set_quick_links_updated_at
  BEFORE UPDATE ON public.quick_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_quick_links_sort ON public.quick_links(sort_order, created_at);

INSERT INTO public.quick_links (name, href, icon, sort_order) VALUES
  ('Outlook',  'https://outlook.office.com',   'mail',          10),
  ('Teams',    'https://teams.microsoft.com',  'message-square', 20),
  ('Intranet', 'https://sharepoint.com',       'home',           30);

COMMIT;