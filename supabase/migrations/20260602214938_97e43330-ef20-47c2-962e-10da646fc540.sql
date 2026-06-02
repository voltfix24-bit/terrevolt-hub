CREATE TABLE public.kb_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'book-open',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kb_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  author text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE INDEX idx_kb_articles_category ON public.kb_articles(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_articles TO anon, authenticated;
GRANT ALL ON public.kb_categories TO service_role;
GRANT ALL ON public.kb_articles TO service_role;

ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kb_categories" ON public.kb_categories FOR SELECT USING (true);
CREATE POLICY "Public insert kb_categories" ON public.kb_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update kb_categories" ON public.kb_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete kb_categories" ON public.kb_categories FOR DELETE USING (true);

CREATE POLICY "Public read kb_articles" ON public.kb_articles FOR SELECT USING (true);
CREATE POLICY "Public insert kb_articles" ON public.kb_articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update kb_articles" ON public.kb_articles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete kb_articles" ON public.kb_articles FOR DELETE USING (true);

CREATE TRIGGER kb_categories_set_updated_at
BEFORE UPDATE ON public.kb_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER kb_articles_set_updated_at
BEFORE UPDATE ON public.kb_articles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.kb_categories (slug, name, description, icon, sort_order) VALUES
('werkvoorbereiding', 'Werkvoorbereiding', 'Voorbereiding van projecten en werkzaamheden.', 'clipboard-list', 10),
('veiligheid', 'Veiligheid', 'Veiligheidsinstructies en richtlijnen op de werkplek.', 'shield-check', 20),
('bei', 'BEI', 'Bedrijfsvoering Elektrische Installaties.', 'zap', 30),
('aarding', 'Aarding', 'Aardingstechnieken, metingen en rapportages.', 'plug', 40),
('ls-meten', 'LS Meten', 'Laagspanning meten — procedures en richtlijnen.', 'activity', 50),
('materialen', 'Materialen', 'Materiaalspecificaties en bestelprocessen.', 'package', 60),
('urenregistratie', 'Urenregistratie', 'Uren boeken op projecten en activiteiten.', 'clock', 70),
('bedrijfsprocessen', 'Bedrijfsprocessen', 'Interne processen en werkwijzen.', 'workflow', 80);