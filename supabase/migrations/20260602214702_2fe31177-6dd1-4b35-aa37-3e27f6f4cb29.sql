CREATE TABLE public.news (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Algemeen',
  summary text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_image text NOT NULL DEFAULT '',
  publish_date date NOT NULL DEFAULT CURRENT_DATE,
  author text NOT NULL DEFAULT '',
  important boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO anon, authenticated;
GRANT ALL ON public.news TO service_role;

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read news" ON public.news FOR SELECT USING (true);
CREATE POLICY "Public insert news" ON public.news FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update news" ON public.news FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete news" ON public.news FOR DELETE USING (true);

CREATE TRIGGER news_set_updated_at
BEFORE UPDATE ON public.news
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.news (title, category, summary, content, publish_date, author, important, sort_order) VALUES
('Nieuwe versie TerreVolt Planner beschikbaar', 'Product', 'Een vernieuwde planningsweergave, snellere ploegtoewijzing en verbeterde capaciteitsoverzichten.', 'De nieuwe versie van TerreVolt Planner is nu beschikbaar voor alle medewerkers.', '2026-06-02', 'Productteam', true, 10),
('Nieuwe BEI update gepubliceerd', 'Veiligheid', 'Belangrijke wijzigingen in de Bedrijfsvoering Elektrische Installaties.', 'Lees wat er voor jouw werk verandert in de nieuwste BEI update.', '2026-05-28', 'KAM', false, 20),
('Nieuwe bedrijfsbus geleverd', 'Bedrijf', 'Het wagenpark is uitgebreid met een volledig ingerichte servicebus.', 'De nieuwe servicebus is volledig ingericht voor onze montageteams.', '2026-05-21', 'Facilitair', false, 30);