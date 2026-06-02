
-- Smoelenboek: people directory
CREATE TYPE public.person_type AS ENUM (
  'Medewerker','ZZP''er','Monteur','Werkvoorbereider','Projectleider',
  'Administratie','Directie','Magazijn','Externe partner'
);

CREATE TYPE public.person_status AS ENUM (
  'Beschikbaar','Bezet','Op project','Afwezig','Verlof','Niet actief'
);

CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  job_title text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  person_type public.person_type NOT NULL DEFAULT 'Medewerker',
  employment_type text NOT NULL DEFAULT 'Vast',
  status public.person_status NOT NULL DEFAULT 'Beschikbaar',
  photo_url text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  projects text[] NOT NULL DEFAULT ARRAY[]::text[],
  certifications text[] NOT NULL DEFAULT ARRAY[]::text[],
  bei_authorization text NOT NULL DEFAULT '',
  vehicle text NOT NULL DEFAULT '',
  equipment text NOT NULL DEFAULT '',
  emergency_contact text NOT NULL DEFAULT '',
  emergency_admin_only boolean NOT NULL DEFAULT true,
  hidden_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO anon, authenticated;
GRANT ALL ON public.people TO service_role;

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read people" ON public.people FOR SELECT USING (true);
CREATE POLICY "Public insert people" ON public.people FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update people" ON public.people FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete people" ON public.people FOR DELETE USING (true);

CREATE TRIGGER people_set_updated_at BEFORE UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_people_status ON public.people(status);
CREATE INDEX idx_people_department ON public.people(department);
CREATE INDEX idx_people_type ON public.people(person_type);
