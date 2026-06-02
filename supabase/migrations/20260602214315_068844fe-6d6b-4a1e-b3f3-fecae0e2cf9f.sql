
CREATE TYPE public.app_category AS ENUM ('Operationeel', 'Administratie', 'Rapportage', 'Externe systemen', 'Overig');

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'sparkles',
  category public.app_category NOT NULL DEFAULT 'Overig',
  url text NOT NULL DEFAULT '/',
  new_tab boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  accent text NOT NULL DEFAULT 'brand',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX applications_sort_idx ON public.applications (sort_order, created_at);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_set_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read applications" ON public.applications FOR SELECT USING (true);
CREATE POLICY "Public insert applications" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update applications" ON public.applications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete applications" ON public.applications FOR DELETE USING (true);
