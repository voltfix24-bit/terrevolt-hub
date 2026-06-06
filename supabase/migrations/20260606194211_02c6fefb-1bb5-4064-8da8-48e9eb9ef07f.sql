
-- 1. Queue table
CREATE TABLE public.reindex_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type     public.kb_chunk_source NOT NULL,
  source_id       uuid NOT NULL,
  operation       text NOT NULL CHECK (operation IN ('upsert','delete')),
  enqueued_at     timestamptz NOT NULL DEFAULT now(),
  attempts        integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error      text NOT NULL DEFAULT '',
  UNIQUE (source_type, source_id, operation)
);

CREATE INDEX reindex_queue_pending_idx
  ON public.reindex_queue(enqueued_at)
  WHERE attempts < 5;

CREATE INDEX reindex_queue_failed_idx
  ON public.reindex_queue(last_attempt_at DESC)
  WHERE attempts >= 5;

GRANT SELECT ON public.reindex_queue TO authenticated;
GRANT ALL ON public.reindex_queue TO service_role;

ALTER TABLE public.reindex_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_queue" ON public.reindex_queue
  FOR SELECT TO authenticated USING (public.is_admin());

-- 2a. Trigger for kb_articles (only enqueue when content-relevant fields change)
CREATE OR REPLACE FUNCTION public.enqueue_kb_article_reindex()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.title           IS NOT DISTINCT FROM OLD.title
       AND NEW.summary     IS NOT DISTINCT FROM OLD.summary
       AND NEW.content     IS NOT DISTINCT FROM OLD.content
       AND NEW.important_notes IS NOT DISTINCT FROM OLD.important_notes
       AND NEW.tags         IS NOT DISTINCT FROM OLD.tags
       AND NEW.client       IS NOT DISTINCT FROM OLD.client
       AND NEW.section_id   IS NOT DISTINCT FROM OLD.section_id
       AND NEW.status       IS NOT DISTINCT FROM OLD.status
       AND NEW.extracted_text IS NOT DISTINCT FROM OLD.extracted_text
       AND NEW.file_url     IS NOT DISTINCT FROM OLD.file_url
    THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.reindex_queue (source_type, source_id, operation)
  VALUES (
    'kb_article'::public.kb_chunk_source,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'upsert' END
  )
  ON CONFLICT (source_type, source_id, operation)
  DO UPDATE SET enqueued_at = now(), attempts = 0, last_error = '';

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER auto_reindex_kb_articles
  AFTER INSERT OR UPDATE OR DELETE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_kb_article_reindex();

-- 2b. Generic trigger
CREATE OR REPLACE FUNCTION public.enqueue_reindex_generic()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  src_type public.kb_chunk_source;
BEGIN
  src_type := CASE TG_TABLE_NAME
    WHEN 'news'             THEN 'news'::public.kb_chunk_source
    WHEN 'finance_clients'  THEN 'finance_client'::public.kb_chunk_source
    WHEN 'people'           THEN 'person'::public.kb_chunk_source
    WHEN 'applications'     THEN 'application'::public.kb_chunk_source
    WHEN 'sharepoint_items' THEN 'sharepoint_item'::public.kb_chunk_source
    WHEN 'partner_links'    THEN 'partner_link'::public.kb_chunk_source
    WHEN 'quick_links'      THEN 'quick_link'::public.kb_chunk_source
    WHEN 'departments'      THEN 'department'::public.kb_chunk_source
    ELSE NULL
  END;

  IF src_type IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.reindex_queue (source_type, source_id, operation)
  VALUES (
    src_type,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'upsert' END
  )
  ON CONFLICT (source_type, source_id, operation)
  DO UPDATE SET enqueued_at = now(), attempts = 0, last_error = '';

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER auto_reindex_news
  AFTER INSERT OR UPDATE OR DELETE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

CREATE TRIGGER auto_reindex_finance_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.finance_clients
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

CREATE TRIGGER auto_reindex_people
  AFTER INSERT OR UPDATE OR DELETE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

CREATE TRIGGER auto_reindex_applications
  AFTER INSERT OR UPDATE OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

CREATE TRIGGER auto_reindex_sharepoint_items
  AFTER INSERT OR UPDATE OR DELETE ON public.sharepoint_items
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

CREATE TRIGGER auto_reindex_partner_links
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_links
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

CREATE TRIGGER auto_reindex_quick_links
  AFTER INSERT OR UPDATE OR DELETE ON public.quick_links
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

CREATE TRIGGER auto_reindex_departments
  AFTER INSERT OR UPDATE OR DELETE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reindex_generic();

-- 3. Stats RPC
CREATE OR REPLACE FUNCTION public.reindex_queue_stats()
RETURNS TABLE (
  pending     integer,
  failed      integer,
  oldest_age_seconds integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::integer FROM reindex_queue WHERE attempts < 5),
    (SELECT count(*)::integer FROM reindex_queue WHERE attempts >= 5),
    (SELECT COALESCE(EXTRACT(EPOCH FROM (now() - min(enqueued_at)))::integer, 0)
     FROM reindex_queue WHERE attempts < 5);
$$;
GRANT EXECUTE ON FUNCTION public.reindex_queue_stats() TO authenticated;

-- 4. Failed items RPC (admin only) — joins to source tables for human title
CREATE OR REPLACE FUNCTION public.reindex_queue_failed_items()
RETURNS TABLE (
  id            uuid,
  source_type   public.kb_chunk_source,
  source_id     uuid,
  operation     text,
  attempts      integer,
  last_attempt_at timestamptz,
  last_error    text,
  enqueued_at   timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, source_type, source_id, operation, attempts, last_attempt_at, last_error, enqueued_at
  FROM public.reindex_queue
  WHERE attempts >= 5
  ORDER BY last_attempt_at DESC NULLS LAST
  LIMIT 100;
$$;
GRANT EXECUTE ON FUNCTION public.reindex_queue_failed_items() TO authenticated;

-- 5. Retry one / all (admin only)
CREATE OR REPLACE FUNCTION public.reindex_queue_retry(item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.reindex_queue
  SET attempts = 0, last_error = '', enqueued_at = now()
  WHERE id = item_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reindex_queue_retry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reindex_queue_retry_all()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.reindex_queue
  SET attempts = 0, last_error = '', enqueued_at = now()
  WHERE attempts >= 5;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reindex_queue_retry_all() TO authenticated;

-- 6. Sweep RPC: detect drift and enqueue. Returns counts.
CREATE OR REPLACE FUNCTION public.reindex_sweep()
RETURNS TABLE (enqueued_upserts integer, enqueued_deletes integer, retried integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  upserts integer := 0;
  deletes integer := 0;
  retried integer := 0;
BEGIN
  -- Missing source rows (in source table, no chunks yet) per source_type
  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'kb_article'::public.kb_chunk_source, a.id, 'upsert'
    FROM public.kb_articles a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.kb_chunks c
      WHERE c.source_type = 'kb_article' AND c.source_id = a.id
    )
    ON CONFLICT (source_type, source_id, operation) DO NOTHING
    RETURNING 1
  ) SELECT count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'news'::public.kb_chunk_source, n.id, 'upsert' FROM public.news n
    WHERE n.archived = false
      AND NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='news' AND c.source_id=n.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'finance_client'::public.kb_chunk_source, f.id, 'upsert' FROM public.finance_clients f
    WHERE f.archived = false
      AND NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='finance_client' AND c.source_id=f.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'person'::public.kb_chunk_source, p.id, 'upsert' FROM public.people p
    WHERE p.archived = false
      AND NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='person' AND c.source_id=p.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'application'::public.kb_chunk_source, a.id, 'upsert' FROM public.applications a
    WHERE a.active = true
      AND NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='application' AND c.source_id=a.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'sharepoint_item'::public.kb_chunk_source, s.id, 'upsert' FROM public.sharepoint_items s
    WHERE NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='sharepoint_item' AND c.source_id=s.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'partner_link'::public.kb_chunk_source, p.id, 'upsert' FROM public.partner_links p
    WHERE p.active = true
      AND NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='partner_link' AND c.source_id=p.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'quick_link'::public.kb_chunk_source, q.id, 'upsert' FROM public.quick_links q
    WHERE q.active = true
      AND NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='quick_link' AND c.source_id=q.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  WITH ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT 'department'::public.kb_chunk_source, d.id, 'upsert' FROM public.departments d
    WHERE NOT EXISTS (SELECT 1 FROM public.kb_chunks c WHERE c.source_type='department' AND c.source_id=d.id)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT upserts + count(*)::integer INTO upserts FROM ins;

  -- Orphan chunks (chunk exists for source_id that's no longer in source table)
  WITH orphan AS (
    SELECT c.source_type, c.source_id FROM public.kb_chunks c
    WHERE (c.source_type = 'kb_article'      AND NOT EXISTS (SELECT 1 FROM public.kb_articles      x WHERE x.id = c.source_id))
       OR (c.source_type = 'news'            AND NOT EXISTS (SELECT 1 FROM public.news             x WHERE x.id = c.source_id))
       OR (c.source_type = 'finance_client'  AND NOT EXISTS (SELECT 1 FROM public.finance_clients  x WHERE x.id = c.source_id))
       OR (c.source_type = 'person'          AND NOT EXISTS (SELECT 1 FROM public.people           x WHERE x.id = c.source_id))
       OR (c.source_type = 'application'     AND NOT EXISTS (SELECT 1 FROM public.applications     x WHERE x.id = c.source_id))
       OR (c.source_type = 'sharepoint_item' AND NOT EXISTS (SELECT 1 FROM public.sharepoint_items x WHERE x.id = c.source_id))
       OR (c.source_type = 'partner_link'    AND NOT EXISTS (SELECT 1 FROM public.partner_links    x WHERE x.id = c.source_id))
       OR (c.source_type = 'quick_link'      AND NOT EXISTS (SELECT 1 FROM public.quick_links      x WHERE x.id = c.source_id))
       OR (c.source_type = 'department'      AND NOT EXISTS (SELECT 1 FROM public.departments      x WHERE x.id = c.source_id))
    GROUP BY c.source_type, c.source_id
  ), ins AS (
    INSERT INTO public.reindex_queue (source_type, source_id, operation)
    SELECT source_type, source_id, 'delete' FROM orphan
    ON CONFLICT (source_type, source_id, operation) DO NOTHING
    RETURNING 1
  ) SELECT count(*)::integer INTO deletes FROM ins;

  -- Reset permanently-failed items older than 24h for one more try
  WITH upd AS (
    UPDATE public.reindex_queue
    SET attempts = 0, last_error = '', enqueued_at = now()
    WHERE attempts >= 5 AND last_attempt_at < now() - interval '24 hours'
    RETURNING 1
  ) SELECT count(*)::integer INTO retried FROM upd;

  RETURN QUERY SELECT upserts, deletes, retried;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reindex_sweep() TO service_role;
