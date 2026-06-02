
-- 1. kb_sections (5 hoofdsecties)
CREATE TABLE public.kb_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'book-open',
  accent text NOT NULL DEFAULT 'brand',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_sections TO anon, authenticated;
GRANT ALL ON public.kb_sections TO service_role;

ALTER TABLE public.kb_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read kb_sections" ON public.kb_sections FOR SELECT USING (true);
CREATE POLICY "Public insert kb_sections" ON public.kb_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update kb_sections" ON public.kb_sections FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete kb_sections" ON public.kb_sections FOR DELETE USING (true);

CREATE TRIGGER trg_kb_sections_updated_at
  BEFORE UPDATE ON public.kb_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Status enum
CREATE TYPE public.kb_status AS ENUM ('active', 'draft', 'expired', 'archived');

-- 3. Extend kb_articles
ALTER TABLE public.kb_articles
  ALTER COLUMN category_id DROP NOT NULL,
  ADD COLUMN section_id uuid REFERENCES public.kb_sections(id) ON DELETE SET NULL,
  ADD COLUMN summary text NOT NULL DEFAULT '',
  ADD COLUMN important_notes text NOT NULL DEFAULT '',
  ADD COLUMN owner text NOT NULL DEFAULT '',
  ADD COLUMN client text NOT NULL DEFAULT '',
  ADD COLUMN document_type text NOT NULL DEFAULT 'wiki',
  ADD COLUMN version text NOT NULL DEFAULT '1.0',
  ADD COLUMN document_date date,
  ADD COLUMN valid_from date,
  ADD COLUMN valid_until date,
  ADD COLUMN tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN file_url text NOT NULL DEFAULT '',
  ADD COLUMN file_name text NOT NULL DEFAULT '',
  ADD COLUMN file_size bigint NOT NULL DEFAULT 0,
  ADD COLUMN external_url text NOT NULL DEFAULT '',
  ADD COLUMN status public.kb_status NOT NULL DEFAULT 'active';

CREATE INDEX idx_kb_articles_section ON public.kb_articles(section_id);
CREATE INDEX idx_kb_articles_status ON public.kb_articles(status);
CREATE INDEX idx_kb_articles_client ON public.kb_articles(client);
CREATE INDEX idx_kb_articles_tags ON public.kb_articles USING GIN(tags);

-- 4. kb_versions (versiegeschiedenis)
CREATE TABLE public.kb_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  version text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  external_url text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  document_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_versions TO anon, authenticated;
GRANT ALL ON public.kb_versions TO service_role;

ALTER TABLE public.kb_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read kb_versions" ON public.kb_versions FOR SELECT USING (true);
CREATE POLICY "Public insert kb_versions" ON public.kb_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update kb_versions" ON public.kb_versions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete kb_versions" ON public.kb_versions FOR DELETE USING (true);

CREATE INDEX idx_kb_versions_article ON public.kb_versions(article_id, created_at DESC);

-- 5. Seed 5 main sections
INSERT INTO public.kb_sections (slug, name, description, icon, accent, sort_order) VALUES
  ('techniek-veiligheid', 'Techniek & Veiligheid', 'BEI, aarding, LS meten, materialen en veiligheidsinstructies.', 'hard-hat', 'brand', 10),
  ('finance-wiki', 'Finance Wiki', 'Financiële procedures, facturatie, btw en rapportages.', 'banknote', 'lime', 20),
  ('bedrijfsprocessen', 'Bedrijfsprocessen', 'Interne processen, workflows en kwaliteit.', 'workflow', 'pastel', 30),
  ('opdrachtgever-eisen', 'Opdrachtgever-eisen', 'Specifieke eisen en standaarden per opdrachtgever.', 'clipboard-list', 'navy', 40),
  ('interne-werkinstructies', 'Interne werkinstructies', 'Stap-voor-stap werkinstructies en standaarden.', 'list-checks', 'brand', 50);
