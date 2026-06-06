BEGIN;

CREATE OR REPLACE FUNCTION public.get_kb_chunks_by_ids(chunk_ids uuid[])
RETURNS TABLE (
  id           uuid,
  source_type  public.kb_chunk_source,
  source_id    uuid,
  title        text,
  metadata     jsonb,
  visibility   public.kb_chunk_visibility
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT c.id, c.source_type, c.source_id, c.title, c.metadata, c.visibility
  FROM public.kb_chunks c
  WHERE c.id = ANY(chunk_ids)
    AND (
      c.visibility = 'all'
      OR (c.visibility = 'staff' AND caller_is_staff)
      OR (c.visibility = 'admin' AND caller_is_admin)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_kb_chunks_by_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_kb_chunks_by_ids(uuid[]) TO authenticated;

DROP FUNCTION IF EXISTS public.match_kb_chunks(vector, integer, public.kb_chunk_source[]);

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
  visibility    public.kb_chunk_visibility,
  similarity    float
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.source_type, c.source_id, c.chunk_index,
    c.title, c.content, c.metadata, c.visibility,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks c
  WHERE c.embedding IS NOT NULL
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

REVOKE EXECUTE ON FUNCTION public.match_kb_chunks(vector, integer, public.kb_chunk_source[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_kb_chunks(vector, integer, public.kb_chunk_source[]) TO authenticated;

DROP POLICY IF EXISTS "auth_read_vb_questions" ON public.vraagbaak_questions;
DROP POLICY IF EXISTS "vis_read_vb_questions" ON public.vraagbaak_questions;
CREATE POLICY "vis_read_vb_questions" ON public.vraagbaak_questions
  FOR SELECT TO authenticated
  USING (
    min_visibility = 'all'
    OR (min_visibility = 'staff' AND public.is_staff())
    OR (min_visibility = 'admin' AND public.is_admin())
  );

DO $$
DECLARE
  q record;
  max_rank integer;
  computed public.kb_chunk_visibility;
BEGIN
  FOR q IN
    SELECT id, source_chunk_ids
    FROM public.vraagbaak_questions
    WHERE invalidated_at IS NULL
      AND array_length(source_chunk_ids, 1) IS NOT NULL
  LOOP
    SELECT COALESCE(max(
      CASE c.visibility
        WHEN 'admin' THEN 2
        WHEN 'staff' THEN 1
        ELSE 0
      END
    ), 0) INTO max_rank
    FROM public.kb_chunks c
    WHERE c.id = ANY(q.source_chunk_ids);

    computed := CASE
      WHEN max_rank >= 2 THEN 'admin'::public.kb_chunk_visibility
      WHEN max_rank >= 1 THEN 'staff'::public.kb_chunk_visibility
      ELSE 'all'::public.kb_chunk_visibility
    END;

    UPDATE public.vraagbaak_questions
    SET min_visibility = computed
    WHERE id = q.id;
  END LOOP;
END $$;

COMMIT;