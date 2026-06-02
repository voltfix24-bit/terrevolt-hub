
-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin','management','kantoor','monteur','zzper');

-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'users',
  accent text NOT NULL DEFAULT 'brand',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Public write departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'kantoor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read user_roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Public write user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

-- Security definer helper for future RLS use
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Partner links (proper table — was only in localStorage)
CREATE TABLE public.partner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  href text NOT NULL DEFAULT 'https://',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'globe',
  accent text NOT NULL DEFAULT 'brand',
  category text NOT NULL DEFAULT 'Opdrachtgever',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_links TO anon, authenticated;
GRANT ALL ON public.partner_links TO service_role;
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read partner_links" ON public.partner_links FOR SELECT USING (true);
CREATE POLICY "Public write partner_links" ON public.partner_links FOR ALL USING (true) WITH CHECK (true);

-- Seed departments
INSERT INTO public.departments (name, description, icon, sort_order) VALUES
  ('Directie', 'Bestuur en management', 'briefcase', 1),
  ('Werkvoorbereiding', 'Planning en voorbereiding', 'clipboard-list', 2),
  ('Uitvoering', 'Monteurs en buitendienst', 'hard-hat', 3),
  ('Administratie', 'Finance en back-office', 'wallet', 4),
  ('Engineering', 'Techniek en ontwerp', 'cpu', 5);

-- Seed partner links
INSERT INTO public.partner_links (name, href, description, icon, category, sort_order) VALUES
  ('Van Gelder portaal', 'https://portal.vangelder.com', 'Inlogomgeving voor projecten', 'globe', 'Opdrachtgever', 1),
  ('Heijmans portaal', 'https://heijmans.nl', 'Project- en factuurinformatie', 'globe', 'Opdrachtgever', 2),
  ('Liander Operations', 'https://liander.nl', 'Werkbon en planningsportaal', 'zap', 'Opdrachtgever', 3),
  ('Hanab portaal', 'https://hanab.nl', 'Documenten en bestellingen', 'globe', 'Opdrachtgever', 4),
  ('JR Infra portaal', 'https://jrinfra.nl', 'Werkbonnen en projecten', 'globe', 'Opdrachtgever', 5);
