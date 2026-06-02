
CREATE TABLE public.finance_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT 'brand',
  factuuradres text NOT NULL DEFAULT '',
  inkooporder_info text NOT NULL DEFAULT '',
  factuur_referenties text NOT NULL DEFAULT '',
  verplichte_bijlagen text NOT NULL DEFAULT '',
  btw_verlegd text NOT NULL DEFAULT '',
  g_rekening text NOT NULL DEFAULT '',
  betaaltermijn text NOT NULL DEFAULT '',
  factuur_email text NOT NULL DEFAULT '',
  veelgemaakte_fouten text NOT NULL DEFAULT '',
  voorbeeld_factuurtekst text NOT NULL DEFAULT '',
  interne_opmerkingen text NOT NULL DEFAULT '',
  related_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_clients TO anon, authenticated;
GRANT ALL ON public.finance_clients TO service_role;
ALTER TABLE public.finance_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read finance_clients" ON public.finance_clients FOR SELECT USING (true);
CREATE POLICY "Public insert finance_clients" ON public.finance_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update finance_clients" ON public.finance_clients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete finance_clients" ON public.finance_clients FOR DELETE USING (true);

CREATE TRIGGER set_finance_clients_updated_at
BEFORE UPDATE ON public.finance_clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.finance_clients (slug, name, short_description, accent, sort_order) VALUES
  ('van-gelder', 'Van Gelder', 'Factureren naar Van Gelder Groep', 'brand', 10),
  ('heijmans', 'Heijmans', 'Factureren naar Heijmans Infra', 'brand', 20),
  ('hanab', 'Hanab', 'Factureren naar Hanab Nederland', 'brand', 30),
  ('jr-infra', 'JR Infra', 'Factureren naar JR Infra', 'brand', 40),
  ('liander', 'Liander', 'Factureren naar Liander / Alliander', 'brand', 50),
  ('overige', 'Overige opdrachtgevers', 'Standaardprocedure voor overige klanten', 'brand', 99);
