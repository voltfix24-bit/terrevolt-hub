DROP FUNCTION IF EXISTS public.search_kb_chunks(text, integer);
DROP FUNCTION IF EXISTS public.search_kb_chunks(text, integer, kb_chunk_source[]);
DROP FUNCTION IF EXISTS public.search_kb_chunks(text, integer, kb_chunk_source[], timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_text text,
  match_count integer DEFAULT 20,
  source_filter kb_chunk_source[] DEFAULT NULL,
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
  q text := lower(coalesce(trim(query_text), ''));
  raw_tokens text[];
  tokens text[];
  tsq tsquery;
  tsq_str text;
BEGIN
  IF length(q) < 2 THEN RETURN; END IF;

  -- Tokenize on non-alphanumeric (unicode aware)
  raw_tokens := ARRAY(
    SELECT t FROM regexp_split_to_table(q, '[^[:alnum:]]+') AS t
    WHERE length(t) >= 2
  );
  IF array_length(raw_tokens, 1) IS NULL THEN
    raw_tokens := ARRAY[q];
  END IF;

  -- Expand abbreviations / synonyms (both directions)
  WITH base AS (SELECT DISTINCT unnest(raw_tokens) AS tk),
  syn(k, v) AS (VALUES
    ('msr','middenspanningsruimte'), ('middenspanningsruimte','msr'),
    ('station','msr'),
    ('imsr','intelligente'), ('imsr','msr'),
    ('intelligente','imsr'),
    ('rmu','ring'), ('rmu','main'), ('rmu','unit'),
    ('svk','storingsverklikker'), ('storingsverklikker','svk'),
    ('da','distributieautomatisering'), ('distributieautomatisering','da'),
    ('lsrek','laagspanningsrek'), ('laagspanningsrek','lsrek'),
    ('lsrek','ls'), ('lsrek','rek'),
    ('ls','laagspanningsrek'),
    ('safeplus','abb'), ('bluegis','siemens'), ('magnefix','eaton'),
    ('iec','norm'), ('nen','norm'),
    ('trafo','distributietransformator'), ('distributietransformator','trafo'),
    ('cilinder','sleutel'), ('sleutelkluis','sleutel'),
    ('rookmelder','brandmelder'), ('brandmelder','rookmelder'),
    ('kabelkelder','waterdicht'),
    ('vluchtweg','vluchtroute'), ('vluchtroute','vluchtweg'),
    ('aarding','aardelektrode')
  ),
  expanded AS (
    SELECT tk FROM base
    UNION
    SELECT s.v FROM base b JOIN syn s ON s.k = b.tk
    UNION
    SELECT s.k FROM base b JOIN syn s ON s.v = b.tk
  )
  SELECT array_agg(DISTINCT tk) FILTER (WHERE length(tk) >= 2)
    INTO tokens
  FROM expanded;

  IF tokens IS NULL OR array_length(tokens, 1) IS NULL THEN
    tokens := raw_tokens;
  END IF;

  -- Build OR-tsquery from tokens
  tsq_str := array_to_string(
    ARRAY(SELECT t FROM unnest(tokens) AS t WHERE length(t) >= 2),
    ' OR '
  );
  BEGIN
    tsq := CASE WHEN tsq_str <> '' THEN websearch_to_tsquery('simple', tsq_str) ELSE NULL END;
  EXCEPTION WHEN OTHERS THEN tsq := NULL;
  END;

  RETURN QUERY
  WITH scored AS (
    SELECT
      c.id, c.source_type, c.source_id, c.chunk_index,
      c.title, c.content, c.metadata, c.visibility,
      c.source_updated_at, c.indexed_at,
      -- Extra searchable text from kb_articles (tags, summary, client, important_notes)
      COALESCE(
        lower(
          coalesce(array_to_string(a.tags, ' '), '') || ' '
          || coalesce(a.summary, '') || ' '
          || coalesce(a.important_notes, '') || ' '
          || coalesce(a.client, '')
        ),
        ''
      ) AS extra_text,
      (
        SELECT count(*) FROM unnest(tokens) AS t
        WHERE lower(c.title) LIKE '%' || t || '%'
      )::int AS title_hits,
      (
        SELECT count(*) FROM unnest(tokens) AS t
        WHERE lower(c.content) LIKE '%' || t || '%'
      )::int AS content_hits,
      COALESCE(array_length(tokens, 1), 0) AS token_count,
      CASE WHEN tsq IS NOT NULL AND (
        to_tsvector('simple', coalesce(c.title,'')) @@ tsq
        OR to_tsvector('simple', coalesce(c.content,'')) @@ tsq
      ) THEN ts_rank(
        setweight(to_tsvector('simple', coalesce(c.title,'')), 'A')
        || setweight(to_tsvector('simple', coalesce(c.content,'')), 'B'),
        tsq
      )::real ELSE 0::real END AS fts_rank,
      (lower(c.title) = q) AS is_title_exact,
      (lower(c.title) LIKE '%' || q || '%') AS title_has_q,
      (lower(c.content) LIKE '%' || q || '%') AS content_has_q,
      (c.title ~ '\?\s*$') AS title_is_q
    FROM public.kb_chunks c
    LEFT JOIN public.kb_articles a
      ON c.source_type = 'kb_article' AND a.id = c.source_id
    WHERE (
        c.visibility = 'all'
        OR (c.visibility = 'staff' AND caller_is_staff)
        OR (c.visibility = 'admin' AND caller_is_admin)
      )
      AND (source_filter IS NULL OR c.source_type = ANY(source_filter))
      AND (date_from IS NULL OR coalesce(c.source_updated_at, c.indexed_at) >= date_from)
      AND (date_to   IS NULL OR coalesce(c.source_updated_at, c.indexed_at) <= date_to)
  ),
  scored2 AS (
    SELECT
      s.*,
      (
        SELECT count(*) FROM unnest(tokens) AS t
        WHERE s.extra_text LIKE '%' || t || '%'
      )::int AS meta_hits
    FROM scored s
  ),
  ranked AS (
    SELECT
      s.*,
      CASE
        WHEN is_title_exact THEN 1.00
        WHEN title_has_q THEN 0.90
        WHEN token_count > 0 AND title_hits >= token_count THEN 0.80
        WHEN title_hits > 0 THEN 0.65
        WHEN meta_hits > 0 THEN 0.55
        WHEN fts_rank > 0 THEN 0.45 + LEAST(0.10, fts_rank)
        WHEN content_has_q THEN 0.30
        WHEN content_hits > 0 THEN 0.15
        ELSE 0
      END::real AS base_rank,
      CASE
        WHEN is_title_exact THEN 'title_exact'
        WHEN title_has_q THEN 'title_contains'
        WHEN token_count > 0 AND title_hits >= token_count THEN 'title_all_tokens'
        WHEN title_hits > 0 THEN 'title_token'
        WHEN meta_hits > 0 THEN 'tag_or_category'
        WHEN fts_rank > 0 THEN 'fts_content'
        WHEN content_has_q THEN 'content_phrase'
        WHEN content_hits > 0 THEN 'content_token'
        ELSE 'none'
      END AS kind
    FROM scored2 s
  )
  SELECT
    r.id, r.source_type, r.source_id, r.chunk_index,
    r.title, r.content, r.metadata, r.visibility,
    (r.base_rank
      + CASE WHEN r.title_is_q AND r.base_rank > 0 THEN 0.05 ELSE 0 END
      + CASE WHEN r.source_type = 'kb_article' AND r.base_rank > 0 THEN 0.02 ELSE 0 END
    )::real AS rank,
    r.kind AS match_kind
  FROM ranked r
  WHERE r.base_rank > 0
  ORDER BY rank DESC, r.title ASC
  LIMIT match_count;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.search_kb_chunks(text, integer, kb_chunk_source[], timestamptz, timestamptz) TO authenticated, service_role;