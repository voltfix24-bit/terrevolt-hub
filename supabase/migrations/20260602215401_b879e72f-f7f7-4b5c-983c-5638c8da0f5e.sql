
-- SharePoint integration: config (single row with base URL) + items (quick links & folders)

CREATE TABLE public.sharepoint_config (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  base_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = true)
);

GRANT SELECT, INSERT, UPDATE ON public.sharepoint_config TO anon, authenticated;
GRANT ALL ON public.sharepoint_config TO service_role;

ALTER TABLE public.sharepoint_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sharepoint config"
ON public.sharepoint_config FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert sharepoint config"
ON public.sharepoint_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sharepoint config"
ON public.sharepoint_config FOR UPDATE USING (true);

INSERT INTO public.sharepoint_config (id, base_url) VALUES (true, 'https://terrevolt.sharepoint.com');

-- Items: quick links and folders
CREATE TYPE public.sharepoint_kind AS ENUM ('link', 'folder');

CREATE TABLE public.sharepoint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.sharepoint_kind NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  favorite BOOLEAN NOT NULL DEFAULT false,
  last_opened_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sharepoint_items TO anon, authenticated;
GRANT ALL ON public.sharepoint_items TO service_role;

ALTER TABLE public.sharepoint_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sharepoint items"
ON public.sharepoint_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sharepoint items"
ON public.sharepoint_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sharepoint items"
ON public.sharepoint_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sharepoint items"
ON public.sharepoint_items FOR DELETE USING (true);

CREATE TRIGGER set_sharepoint_items_updated
BEFORE UPDATE ON public.sharepoint_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_sharepoint_config_updated
BEFORE UPDATE ON public.sharepoint_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed examples
INSERT INTO public.sharepoint_items (kind, name, description, url, icon, favorite, sort_order) VALUES
('link', 'TerreVolt Intranet', 'Hoofdpagina van het bedrijfsintranet', 'https://terrevolt.sharepoint.com/sites/intranet', 'globe', true, 10),
('link', 'HR Portaal', 'Verlof, salarisstroken en personeelszaken', 'https://terrevolt.sharepoint.com/sites/hr', 'users', true, 20),
('link', 'Veiligheidsdocumenten', 'BEI, VCA en RI&E documentatie', 'https://terrevolt.sharepoint.com/sites/veiligheid', 'shield', false, 30),
('folder', 'Projectdossiers', 'Lopende project documentatie', 'https://terrevolt.sharepoint.com/sites/projecten/Gedeelde%20documenten', 'folder', true, 10),
('folder', 'Werkinstructies', 'Standaard werkinstructies en procedures', 'https://terrevolt.sharepoint.com/sites/operations/Werkinstructies', 'book-open', true, 20),
('folder', 'Formulieren', 'Bedrijfsformulieren en sjablonen', 'https://terrevolt.sharepoint.com/sites/intranet/Formulieren', 'file-text', false, 30);
