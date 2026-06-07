
-- 1. Remove duplicate permissive storage policy on kb-documents
DROP POLICY IF EXISTS "auth_read_kb" ON storage.objects;

-- 2. Admin guard on reindex_queue_failed_items()
CREATE OR REPLACE FUNCTION public.reindex_queue_failed_items()
RETURNS TABLE(id uuid, source_type kb_chunk_source, source_id uuid, operation text, attempts integer, last_attempt_at timestamp with time zone, last_error text, enqueued_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY
    SELECT q.id, q.source_type, q.source_id, q.operation, q.attempts, q.last_attempt_at, q.last_error, q.enqueued_at
    FROM public.reindex_queue q
    WHERE q.attempts >= 5
    ORDER BY q.last_attempt_at DESC NULLS LAST
    LIMIT 100;
END;
$$;

-- 3. Admin guard on reindex_queue_stats()
CREATE OR REPLACE FUNCTION public.reindex_queue_stats()
RETURNS TABLE(pending integer, failed integer, oldest_age_seconds integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY
    SELECT
      (SELECT count(*)::integer FROM public.reindex_queue WHERE attempts < 5),
      (SELECT count(*)::integer FROM public.reindex_queue WHERE attempts >= 5),
      (SELECT COALESCE(EXTRACT(EPOCH FROM (now() - min(enqueued_at)))::integer, 0)
       FROM public.reindex_queue WHERE attempts < 5);
END;
$$;

-- 4. Admin guard on vraagbaak_cache_stats()
CREATE OR REPLACE FUNCTION public.vraagbaak_cache_stats()
RETURNS TABLE(total_cached integer, active_cached integer, invalidated integer, expired integer, total_hits bigint, most_asked text, most_asked_hits integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY
    SELECT
      (SELECT count(*)::integer FROM public.vraagbaak_questions),
      (SELECT count(*)::integer FROM public.vraagbaak_questions WHERE invalidated_at IS NULL AND expires_at > now()),
      (SELECT count(*)::integer FROM public.vraagbaak_questions WHERE invalidated_at IS NOT NULL),
      (SELECT count(*)::integer FROM public.vraagbaak_questions WHERE expires_at <= now()),
      (SELECT COALESCE(sum(hit_count), 0) FROM public.vraagbaak_questions),
      (SELECT question FROM public.vraagbaak_questions ORDER BY hit_count DESC NULLS LAST LIMIT 1),
      (SELECT hit_count FROM public.vraagbaak_questions ORDER BY hit_count DESC NULLS LAST LIMIT 1);
END;
$$;

-- 5. Add active=true guard inline on finance_clients.finance_write
DROP POLICY IF EXISTS "finance_write" ON public.finance_clients;
CREATE POLICY "finance_write" ON public.finance_clients
  FOR ALL TO authenticated
  USING (public.is_active_user() AND (public.is_admin() OR public.has_role(auth.uid(),'management') OR public.has_role(auth.uid(),'finance')))
  WITH CHECK (public.is_active_user() AND (public.is_admin() OR public.has_role(auth.uid(),'management') OR public.has_role(auth.uid(),'finance')));

-- 6. Add active=true guard inline on people_sensitive.sensitive_write
DROP POLICY IF EXISTS "sensitive_write" ON public.people_sensitive;
CREATE POLICY "sensitive_write" ON public.people_sensitive
  FOR ALL TO authenticated
  USING (public.is_active_user() AND (public.is_admin() OR public.has_role(auth.uid(),'management')))
  WITH CHECK (public.is_active_user() AND (public.is_admin() OR public.has_role(auth.uid(),'management')));

-- 7. Tighten vraagbaak_questions INSERT policy
DROP POLICY IF EXISTS "auth_insert_vb_questions" ON public.vraagbaak_questions;
CREATE POLICY "auth_insert_vb_questions" ON public.vraagbaak_questions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

-- 8. Tighten vraagbaak_sources policies
DROP POLICY IF EXISTS "auth_read_vb_sources" ON public.vraagbaak_sources;
CREATE POLICY "auth_read_vb_sources" ON public.vraagbaak_sources
  FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS "auth_insert_vb_sources" ON public.vraagbaak_sources;
CREATE POLICY "auth_insert_vb_sources" ON public.vraagbaak_sources
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());
