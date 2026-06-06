
-- 1. search_misses table
CREATE TABLE IF NOT EXISTS public.search_misses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.search_misses TO authenticated;
GRANT ALL ON public.search_misses TO service_role;

ALTER TABLE public.search_misses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_misses_read ON public.search_misses;
CREATE POLICY search_misses_read ON public.search_misses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS search_misses_insert ON public.search_misses;
CREATE POLICY search_misses_insert ON public.search_misses
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS search_misses_created_idx ON public.search_misses (created_at DESC);

-- 2. Improved weighted search RPC with filters
CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_text text,
  match_count integer DEFAULT 12,
  source_filter kb_chunk_source[] DEFAULT NULL,
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  source_type kb_chunk_source,
  source_id uuid,
  chunk_index integer,
  title text,
  content text,
  metadata jsonb,
  visibility kb_chunk_visibility,
  rank real,
  match_kind text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
  q text := coalesce(trim(query_text), '');
  q_lower text := lower(q);
  like_pattern text := '%' || q || '%';
  tsq tsquery;
BEGIN
  IF length(q) < 2 THEN RETURN; END IF;

  BEGIN
    tsq := websearch_to_tsquery('simple', q);
  EXCEPTION WHEN OTHERS THEN
    tsq := NULL;
  END;

  RETURN QUERY
  WITH scored AS (
    SELECT
      c.*,
      CASE
        WHEN lower(c.title) = q_lower THEN 1.00
        WHEN c.title ILIKE like_pattern THEN 0.80
        WHEN (c.metadata->>'tags') ILIKE like_pattern
          OR (c.metadata->>'category') ILIKE like_pattern
          OR (c.metadata->>'client') ILIKE like_pattern
          OR (c.metadata->>'department') ILIKE like_pattern THEN 0.60
        WHEN tsq IS NOT NULL AND (
             to_tsvector('simple', coalesce(c.title,'')) @@ tsq
          OR to_tsvector('simple', coalesce(c.content,'')) @@ tsq
        ) THEN 0.40 + LEAST(0.15, ts_rank(
            setweight(to_tsvector('simple', coalesce(c.title,'')), 'A')
            || setweight(to_tsvector('simple', coalesce(c.content,'')), 'B'),
            tsq)::real)
        WHEN c.content ILIKE like_pattern THEN 0.20
        ELSE 0
      END::real AS r,
      CASE
        WHEN lower(c.title) = q_lower THEN 'title_exact'
        WHEN c.title ILIKE like_pattern THEN 'title_contains'
        WHEN (c.metadata->>'tags') ILIKE like_pattern
          OR (c.metadata->>'category') ILIKE like_pattern
          OR (c.metadata->>'client') ILIKE like_pattern
          OR (c.metadata->>'department') ILIKE like_pattern THEN 'tag_or_category'
        WHEN tsq IS NOT NULL AND (
             to_tsvector('simple', coalesce(c.title,'')) @@ tsq
          OR to_tsvector('simple', coalesce(c.content,'')) @@ tsq
        ) THEN 'fts_content'
        WHEN c.content ILIKE like_pattern THEN 'content_like'
        ELSE 'none'
      END AS kind
    FROM public.kb_chunks c
    WHERE (
        c.visibility = 'all'
        OR (c.visibility = 'staff' AND caller_is_staff)
        OR (c.visibility = 'admin' AND caller_is_admin)
      )
      AND (source_filter IS NULL OR c.source_type = ANY(source_filter))
      AND (date_from IS NULL OR coalesce(c.source_updated_at, c.indexed_at) >= date_from)
      AND (date_to   IS NULL OR coalesce(c.source_updated_at, c.indexed_at) <= date_to)
  )
  SELECT
    scored.id, scored.source_type, scored.source_id, scored.chunk_index,
    scored.title, scored.content, scored.metadata, scored.visibility,
    scored.r AS rank,
    scored.kind AS match_kind
  FROM scored
  WHERE scored.r > 0
  ORDER BY scored.r DESC, scored.title ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_kb_chunks(text, integer, kb_chunk_source[], timestamptz, timestamptz) TO authenticated;
