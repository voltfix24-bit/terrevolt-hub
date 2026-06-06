
CREATE OR REPLACE FUNCTION public.search_kb_chunks(query_text text, match_count integer DEFAULT 12)
RETURNS TABLE(
  id uuid,
  source_type kb_chunk_source,
  source_id uuid,
  chunk_index integer,
  title text,
  content text,
  metadata jsonb,
  visibility kb_chunk_visibility,
  rank real
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
  q text := coalesce(trim(query_text), '');
  tsq tsquery;
  like_pattern text := '%' || q || '%';
BEGIN
  IF length(q) < 2 THEN
    RETURN;
  END IF;

  BEGIN
    tsq := websearch_to_tsquery('simple', q);
  EXCEPTION WHEN OTHERS THEN
    tsq := NULL;
  END;

  RETURN QUERY
  SELECT
    c.id, c.source_type, c.source_id, c.chunk_index,
    c.title, c.content, c.metadata, c.visibility,
    GREATEST(
      CASE WHEN tsq IS NOT NULL
        THEN ts_rank(
          setweight(to_tsvector('simple', coalesce(c.title,'')), 'A')
          || setweight(to_tsvector('simple', coalesce(c.content,'')), 'B'),
          tsq)
        ELSE 0
      END,
      CASE WHEN c.title ILIKE like_pattern THEN 0.5 ELSE 0 END,
      CASE WHEN c.content ILIKE like_pattern THEN 0.2 ELSE 0 END
    )::real AS rank
  FROM public.kb_chunks c
  WHERE (
      c.visibility = 'all'
      OR (c.visibility = 'staff' AND caller_is_staff)
      OR (c.visibility = 'admin' AND caller_is_admin)
    )
    AND (
      (tsq IS NOT NULL AND (
        to_tsvector('simple', coalesce(c.title,'')) @@ tsq
        OR to_tsvector('simple', coalesce(c.content,'')) @@ tsq
      ))
      OR c.title ILIKE like_pattern
      OR c.content ILIKE like_pattern
    )
  ORDER BY rank DESC NULLS LAST
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_kb_chunks(text, integer) TO authenticated;
