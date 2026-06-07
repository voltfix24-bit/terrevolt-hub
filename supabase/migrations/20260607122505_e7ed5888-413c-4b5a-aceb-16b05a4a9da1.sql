
-- 1. Document visibility on extra link/document sources
ALTER TABLE public.sharepoint_items ADD COLUMN IF NOT EXISTS visibility public.doc_visibility NOT NULL DEFAULT 'all_staff';
ALTER TABLE public.applications     ADD COLUMN IF NOT EXISTS visibility public.doc_visibility NOT NULL DEFAULT 'all_staff';
ALTER TABLE public.partner_links    ADD COLUMN IF NOT EXISTS visibility public.doc_visibility NOT NULL DEFAULT 'all_staff';
ALTER TABLE public.quick_links      ADD COLUMN IF NOT EXISTS visibility public.doc_visibility NOT NULL DEFAULT 'all_staff';

-- Replace read policies to enforce visibility
DROP POLICY IF EXISTS sharepoint_items_read ON public.sharepoint_items;
CREATE POLICY sharepoint_items_read ON public.sharepoint_items FOR SELECT TO authenticated
  USING (public.can_view_doc(visibility));

DROP POLICY IF EXISTS applications_read ON public.applications;
CREATE POLICY applications_read ON public.applications FOR SELECT TO authenticated
  USING (public.can_view_doc(visibility));

DROP POLICY IF EXISTS partner_links_read ON public.partner_links;
CREATE POLICY partner_links_read ON public.partner_links FOR SELECT TO authenticated
  USING (public.can_view_doc(visibility));

DROP POLICY IF EXISTS quick_links_read ON public.quick_links;
CREATE POLICY quick_links_read ON public.quick_links FOR SELECT TO authenticated
  USING (public.can_view_doc(visibility));

-- 2. Centralised chunk-source visibility check used by search functions
CREATE OR REPLACE FUNCTION public.can_view_chunk_source(_st public.kb_chunk_source, _sid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _st
    WHEN 'kb_article'      THEN EXISTS (SELECT 1 FROM public.kb_articles      WHERE id=_sid AND public.can_view_doc(visibility))
    WHEN 'sharepoint_item' THEN EXISTS (SELECT 1 FROM public.sharepoint_items WHERE id=_sid AND public.can_view_doc(visibility))
    WHEN 'application'     THEN EXISTS (SELECT 1 FROM public.applications    WHERE id=_sid AND public.can_view_doc(visibility))
    WHEN 'partner_link'    THEN EXISTS (SELECT 1 FROM public.partner_links   WHERE id=_sid AND public.can_view_doc(visibility))
    WHEN 'quick_link'      THEN EXISTS (SELECT 1 FROM public.quick_links     WHERE id=_sid AND public.can_view_doc(visibility))
    ELSE true
  END;
$$;

-- 3. Patch search/match/get functions to apply per-source visibility
CREATE OR REPLACE FUNCTION public.match_kb_chunks(query_embedding vector, match_count integer DEFAULT 12, source_filter public.kb_chunk_source[] DEFAULT NULL::public.kb_chunk_source[])
 RETURNS TABLE(id uuid, source_type public.kb_chunk_source, source_id uuid, chunk_index integer, title text, content text, metadata jsonb, visibility public.kb_chunk_visibility, similarity double precision)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT c.id, c.source_type, c.source_id, c.chunk_index,
         c.title, c.content, c.metadata, c.visibility,
         1 - (c.embedding <=> query_embedding)
  FROM public.kb_chunks c
  WHERE c.embedding IS NOT NULL
    AND (source_filter IS NULL OR c.source_type = ANY(source_filter))
    AND (
      c.visibility = 'all'
      OR (c.visibility = 'staff' AND caller_is_staff)
      OR (c.visibility = 'admin' AND caller_is_admin)
    )
    AND public.can_view_chunk_source(c.source_type, c.source_id)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_kb_chunks_by_ids(chunk_ids uuid[])
 RETURNS TABLE(id uuid, source_type public.kb_chunk_source, source_id uuid, title text, metadata jsonb, visibility public.kb_chunk_visibility)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    )
    AND public.can_view_chunk_source(c.source_type, c.source_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_kb_chunks(query_text text, match_count integer DEFAULT 20, source_filter public.kb_chunk_source[] DEFAULT NULL::public.kb_chunk_source[], date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, date_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, source_type public.kb_chunk_source, source_id uuid, chunk_index integer, title text, content text, metadata jsonb, visibility public.kb_chunk_visibility, rank real, match_kind text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  raw_tokens := ARRAY(
    SELECT t FROM regexp_split_to_table(q, '[^[:alnum:]]+') AS t WHERE length(t) >= 2
  );
  IF array_length(raw_tokens, 1) IS NULL THEN raw_tokens := ARRAY[q]; END IF;

  WITH base AS (SELECT DISTINCT unnest(raw_tokens) AS tk),
  syn(k, v) AS (VALUES
    ('msr','middenspanningsruimte'), ('middenspanningsruimte','msr'),
    ('station','msr'),('imsr','intelligente'),('imsr','msr'),
    ('intelligente','imsr'),('rmu','ring'),('rmu','main'),('rmu','unit'),
    ('svk','storingsverklikker'),('storingsverklikker','svk'),
    ('da','distributieautomatisering'),('distributieautomatisering','da'),
    ('lsrek','laagspanningsrek'),('laagspanningsrek','lsrek'),
    ('lsrek','ls'),('lsrek','rek'),('ls','laagspanningsrek'),
    ('safeplus','abb'),('bluegis','siemens'),('magnefix','eaton'),
    ('iec','norm'),('nen','norm'),
    ('trafo','distributietransformator'),('distributietransformator','trafo'),
    ('cilinder','sleutel'),('sleutelkluis','sleutel'),
    ('rookmelder','brandmelder'),('brandmelder','rookmelder'),
    ('kabelkelder','waterdicht'),
    ('vluchtweg','vluchtroute'),('vluchtroute','vluchtweg'),
    ('aarding','aardelektrode')
  ),
  expanded AS (
    SELECT tk FROM base
    UNION SELECT s.v FROM base b JOIN syn s ON s.k = b.tk
    UNION SELECT s.k FROM base b JOIN syn s ON s.v = b.tk
  )
  SELECT array_agg(DISTINCT tk) FILTER (WHERE length(tk) >= 2) INTO tokens FROM expanded;
  IF tokens IS NULL OR array_length(tokens, 1) IS NULL THEN tokens := raw_tokens; END IF;

  tsq_str := array_to_string(ARRAY(SELECT t FROM unnest(tokens) AS t WHERE length(t) >= 2), ' OR ');
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
      COALESCE(lower(coalesce(array_to_string(a.tags, ' '), '') || ' '
        || coalesce(a.summary, '') || ' '
        || coalesce(a.important_notes, '') || ' '
        || coalesce(a.client, '')), '') AS extra_text,
      (SELECT count(*) FROM unnest(tokens) AS t WHERE lower(c.title) LIKE '%' || t || '%')::int AS title_hits,
      (SELECT count(*) FROM unnest(tokens) AS t WHERE lower(c.content) LIKE '%' || t || '%')::int AS content_hits,
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
      AND public.can_view_chunk_source(c.source_type, c.source_id)
      AND (source_filter IS NULL OR c.source_type = ANY(source_filter))
      AND (date_from IS NULL OR coalesce(c.source_updated_at, c.indexed_at) >= date_from)
      AND (date_to   IS NULL OR coalesce(c.source_updated_at, c.indexed_at) <= date_to)
  ),
  scored2 AS (
    SELECT s.*,
      (SELECT count(*) FROM unnest(tokens) AS t WHERE s.extra_text LIKE '%' || t || '%')::int AS meta_hits
    FROM scored s
  ),
  ranked AS (
    SELECT s.*,
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
  SELECT r.id, r.source_type, r.source_id, r.chunk_index,
    r.title, r.content, r.metadata, r.visibility,
    (r.base_rank
      + CASE WHEN r.title_is_q AND r.base_rank > 0 THEN 0.05 ELSE 0 END
      + CASE WHEN r.source_type = 'kb_article' AND r.base_rank > 0 THEN 0.02 ELSE 0 END
    )::real AS rank,
    r.kind
  FROM ranked r
  WHERE r.base_rank > 0
  ORDER BY rank DESC, r.title ASC
  LIMIT match_count;
END;
$function$;

-- 4. Tighten user_roles INSERT: nobody may grant a role to themselves
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage('manage_users')
    AND user_id <> auth.uid()
    AND (role <> 'admin' OR public.is_admin())
  );

-- 5. Audit triggers for role and permission changes
CREATE OR REPLACE FUNCTION public.audit_role_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_audit(
    'role.change',
    'user_roles',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'op', TG_OP,
      'target_user', COALESCE(NEW.user_id, OLD.user_id),
      'old', CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
      'new', CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
    )
  );
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.audit_permission_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_audit(
    'permission.change',
    'user_permissions',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'op', TG_OP,
      'target_user', COALESCE(NEW.user_id, OLD.user_id),
      'permission', COALESCE(NEW.permission, OLD.permission)
    )
  );
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_role_change();

DROP TRIGGER IF EXISTS audit_user_permissions ON public.user_permissions;
CREATE TRIGGER audit_user_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.audit_permission_change();
