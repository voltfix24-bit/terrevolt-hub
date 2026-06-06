
ALTER TABLE public.vraagbaak_questions
  ADD COLUMN IF NOT EXISTS question_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS source_chunk_ids   uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS expires_at         timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS invalidated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS hit_count          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_hit_at        timestamptz,
  ADD COLUMN IF NOT EXISTS min_visibility     public.kb_chunk_visibility NOT NULL DEFAULT 'all';

CREATE INDEX IF NOT EXISTS vraagbaak_questions_embedding_idx
  ON public.vraagbaak_questions USING ivfflat (question_embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE INDEX IF NOT EXISTS vraagbaak_questions_active_idx
  ON public.vraagbaak_questions(expires_at)
  WHERE invalidated_at IS NULL;

CREATE OR REPLACE FUNCTION public.find_cached_answer(
  query_embedding vector(1536),
  threshold       float DEFAULT 0.92
)
RETURNS TABLE (
  id               uuid,
  question         text,
  short_answer     text,
  steps            jsonb,
  summary          text,
  follow_ups       jsonb,
  has_sources      boolean,
  source_chunk_ids uuid[],
  similarity       float,
  age_days         integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT
    q.id, q.question, q.short_answer, q.steps, q.summary, q.follow_ups,
    q.has_sources, q.source_chunk_ids,
    1 - (q.question_embedding <=> query_embedding) AS similarity,
    EXTRACT(DAY FROM now() - q.created_at)::integer AS age_days
  FROM public.vraagbaak_questions q
  WHERE q.question_embedding IS NOT NULL
    AND q.invalidated_at IS NULL
    AND q.expires_at > now()
    AND (
      q.min_visibility = 'all'
      OR (q.min_visibility = 'staff' AND caller_is_staff)
      OR (q.min_visibility = 'admin' AND caller_is_admin)
    )
    AND 1 - (q.question_embedding <=> query_embedding) >= threshold
  ORDER BY q.question_embedding <=> query_embedding
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.find_cached_answer(vector, float) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_cache_hit(question_id uuid)
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.vraagbaak_questions
  SET hit_count = hit_count + 1, last_hit_at = now()
  WHERE id = question_id;
$$;
GRANT EXECUTE ON FUNCTION public.register_cache_hit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.invalidate_cached_for_chunk()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  changed_id uuid := COALESCE(NEW.id, OLD.id);
BEGIN
  UPDATE public.vraagbaak_questions
  SET invalidated_at = now()
  WHERE invalidated_at IS NULL
    AND changed_id = ANY(source_chunk_ids);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS kb_chunks_invalidate_cache_update ON public.kb_chunks;
CREATE TRIGGER kb_chunks_invalidate_cache_update
  AFTER UPDATE ON public.kb_chunks
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION public.invalidate_cached_for_chunk();

DROP TRIGGER IF EXISTS kb_chunks_invalidate_cache_delete ON public.kb_chunks;
CREATE TRIGGER kb_chunks_invalidate_cache_delete
  AFTER DELETE ON public.kb_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_cached_for_chunk();

CREATE OR REPLACE FUNCTION public.invalidate_on_outdated_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.feedback_type = 'outdated' THEN
    UPDATE public.vraagbaak_questions
    SET invalidated_at = now()
    WHERE id = NEW.question_id AND invalidated_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vraagbaak_feedback_invalidate_cache ON public.vraagbaak_feedback;
CREATE TRIGGER vraagbaak_feedback_invalidate_cache
  AFTER INSERT ON public.vraagbaak_feedback
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_on_outdated_feedback();

CREATE OR REPLACE FUNCTION public.vraagbaak_cache_stats()
RETURNS TABLE (
  total_cached    integer,
  active_cached   integer,
  invalidated     integer,
  expired         integer,
  total_hits      bigint,
  most_asked      text,
  most_asked_hits integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::integer FROM public.vraagbaak_questions),
    (SELECT count(*)::integer FROM public.vraagbaak_questions WHERE invalidated_at IS NULL AND expires_at > now()),
    (SELECT count(*)::integer FROM public.vraagbaak_questions WHERE invalidated_at IS NOT NULL),
    (SELECT count(*)::integer FROM public.vraagbaak_questions WHERE expires_at <= now()),
    (SELECT COALESCE(sum(hit_count), 0) FROM public.vraagbaak_questions),
    (SELECT question FROM public.vraagbaak_questions ORDER BY hit_count DESC NULLS LAST LIMIT 1),
    (SELECT hit_count FROM public.vraagbaak_questions ORDER BY hit_count DESC NULLS LAST LIMIT 1);
$$;
GRANT EXECUTE ON FUNCTION public.vraagbaak_cache_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.vraagbaak_clear_cache()
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.vraagbaak_questions
  SET invalidated_at = now()
  WHERE invalidated_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.vraagbaak_clear_cache() TO authenticated;
