
ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS file_path             text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extracted_text        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extraction_status     text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS extraction_error      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extracted_at          timestamptz,
  ADD COLUMN IF NOT EXISTS extracted_file_size   bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extracted_page_count  integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_articles_extraction_status_check'
  ) THEN
    ALTER TABLE public.kb_articles
      ADD CONSTRAINT kb_articles_extraction_status_check
      CHECK (extraction_status IN ('not_applicable','pending','ok','scanned','failed','too_large'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS kb_articles_extraction_status_idx
  ON public.kb_articles(extraction_status)
  WHERE extraction_status IN ('pending','scanned','failed');

UPDATE public.kb_articles
SET extraction_status = 'pending'
WHERE file_url <> '' AND extraction_status = 'not_applicable';

CREATE OR REPLACE FUNCTION public.pdf_extraction_stats()
RETURNS TABLE (
  total_with_pdf  integer,
  extracted_ok    integer,
  pending         integer,
  scanned         integer,
  failed          integer,
  too_large       integer,
  total_pages     bigint,
  avg_chars       integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::integer FROM kb_articles WHERE file_url <> ''),
    (SELECT count(*)::integer FROM kb_articles WHERE extraction_status = 'ok'),
    (SELECT count(*)::integer FROM kb_articles WHERE extraction_status = 'pending'),
    (SELECT count(*)::integer FROM kb_articles WHERE extraction_status = 'scanned'),
    (SELECT count(*)::integer FROM kb_articles WHERE extraction_status = 'failed'),
    (SELECT count(*)::integer FROM kb_articles WHERE extraction_status = 'too_large'),
    (SELECT COALESCE(sum(extracted_page_count), 0) FROM kb_articles),
    (SELECT COALESCE(avg(length(extracted_text))::integer, 0) FROM kb_articles WHERE extraction_status = 'ok');
$$;

GRANT EXECUTE ON FUNCTION public.pdf_extraction_stats() TO authenticated;
