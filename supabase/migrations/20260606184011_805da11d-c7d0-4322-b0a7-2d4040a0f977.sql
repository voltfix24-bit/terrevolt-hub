BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE public.kb_chunk_source AS ENUM (
  'kb_article',
  'news',
  'finance_client',
  'person',
  'application',
  'sharepoint_item',
  'partner_link',
  'quick_link',
  'department'
);

CREATE TYPE public.kb_chunk_visibility AS ENUM ('all', 'staff', 'admin');

CREATE TABLE public.kb_chunks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type         public.kb_chunk_source NOT NULL,
  source_id           uuid NOT NULL,
  chunk_index         integer NOT NULL DEFAULT 0,
  title               text NOT NULL,
  content             text NOT NULL,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding           vector(1536),
  visibility          public.kb_chunk_visibility NOT NULL DEFAULT 'all',
  source_updated_at   timestamptz,
  indexed_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, chunk_index)
);

CREATE INDEX kb_chunks_source_idx ON public.kb_chunks(source_type, source_id);
CREATE INDEX kb_chunks_visibility_idx ON public.kb_chunks(visibility);
CREATE INDEX kb_chunks_embedding_idx
  ON public.kb_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

GRANT SELECT ON public.kb_chunks TO authenticated;
GRANT ALL ON public.kb_chunks TO service_role;

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_read" ON public.kb_chunks
  FOR SELECT TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(1536),
  match_count     integer DEFAULT 12,
  source_filter   public.kb_chunk_source[] DEFAULT NULL
)
RETURNS TABLE (
  id            uuid,
  source_type   public.kb_chunk_source,
  source_id     uuid,
  chunk_index   integer,
  title         text,
  content       text,
  metadata      jsonb,
  similarity    float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_staff boolean;
  caller_is_admin boolean;
BEGIN
  caller_is_staff := public.is_staff();
  caller_is_admin := public.is_admin();

  RETURN QUERY
  SELECT
    c.id,
    c.source_type,
    c.source_id,
    c.chunk_index,
    c.title,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks c
  WHERE
    c.embedding IS NOT NULL
    AND (source_filter IS NULL OR c.source_type = ANY(source_filter))
    AND (
      c.visibility = 'all'
      OR (c.visibility = 'staff' AND caller_is_staff)
      OR (c.visibility = 'admin' AND caller_is_admin)
    )
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_kb_chunks(vector, integer, public.kb_chunk_source[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.count_kb_chunks()
RETURNS TABLE (total bigint, last_indexed timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint, max(indexed_at) FROM public.kb_chunks;
$$;

GRANT EXECUTE ON FUNCTION public.count_kb_chunks() TO authenticated;

ALTER TABLE public.vraagbaak_sources
  ADD COLUMN IF NOT EXISTS source_type public.kb_chunk_source NOT NULL DEFAULT 'kb_article';

COMMIT;