
CREATE TABLE public.vraagbaak_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  short_answer text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL DEFAULT '',
  follow_ups jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  has_sources boolean NOT NULL DEFAULT false,
  asked_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vraagbaak_questions TO anon, authenticated;
GRANT ALL ON public.vraagbaak_questions TO service_role;
ALTER TABLE public.vraagbaak_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vraagbaak_questions" ON public.vraagbaak_questions FOR SELECT USING (true);
CREATE POLICY "Public insert vraagbaak_questions" ON public.vraagbaak_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vraagbaak_questions" ON public.vraagbaak_questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete vraagbaak_questions" ON public.vraagbaak_questions FOR DELETE USING (true);

CREATE TABLE public.vraagbaak_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.vraagbaak_questions(id) ON DELETE CASCADE,
  article_id uuid,
  title text NOT NULL DEFAULT '',
  section_heading text NOT NULL DEFAULT '',
  page_number integer,
  file_url text NOT NULL DEFAULT '',
  external_url text NOT NULL DEFAULT '',
  last_updated date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vraagbaak_sources TO anon, authenticated;
GRANT ALL ON public.vraagbaak_sources TO service_role;
ALTER TABLE public.vraagbaak_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vraagbaak_sources" ON public.vraagbaak_sources FOR SELECT USING (true);
CREATE POLICY "Public insert vraagbaak_sources" ON public.vraagbaak_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vraagbaak_sources" ON public.vraagbaak_sources FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete vraagbaak_sources" ON public.vraagbaak_sources FOR DELETE USING (true);

CREATE TYPE public.vraagbaak_feedback_type AS ENUM ('correct', 'unclear', 'missing_source', 'outdated');

CREATE TABLE public.vraagbaak_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.vraagbaak_questions(id) ON DELETE CASCADE,
  feedback_type public.vraagbaak_feedback_type NOT NULL,
  note text NOT NULL DEFAULT '',
  given_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vraagbaak_feedback TO anon, authenticated;
GRANT ALL ON public.vraagbaak_feedback TO service_role;
ALTER TABLE public.vraagbaak_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vraagbaak_feedback" ON public.vraagbaak_feedback FOR SELECT USING (true);
CREATE POLICY "Public insert vraagbaak_feedback" ON public.vraagbaak_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vraagbaak_feedback" ON public.vraagbaak_feedback FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete vraagbaak_feedback" ON public.vraagbaak_feedback FOR DELETE USING (true);

CREATE TABLE public.vraagbaak_saved (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.vraagbaak_questions(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  saved_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vraagbaak_saved TO anon, authenticated;
GRANT ALL ON public.vraagbaak_saved TO service_role;
ALTER TABLE public.vraagbaak_saved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vraagbaak_saved" ON public.vraagbaak_saved FOR SELECT USING (true);
CREATE POLICY "Public insert vraagbaak_saved" ON public.vraagbaak_saved FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vraagbaak_saved" ON public.vraagbaak_saved FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete vraagbaak_saved" ON public.vraagbaak_saved FOR DELETE USING (true);

CREATE TRIGGER set_vraagbaak_questions_updated_at
BEFORE UPDATE ON public.vraagbaak_questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_vraagbaak_sources_question ON public.vraagbaak_sources(question_id);
CREATE INDEX idx_vraagbaak_feedback_question ON public.vraagbaak_feedback(question_id);
CREATE INDEX idx_vraagbaak_saved_question ON public.vraagbaak_saved(question_id);
