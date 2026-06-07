
-- 1) Document visibility
CREATE TYPE public.doc_visibility AS ENUM ('all_staff','management','finance','planning','admin_only');

ALTER TABLE public.kb_articles
  ADD COLUMN visibility public.doc_visibility NOT NULL DEFAULT 'all_staff';

CREATE INDEX IF NOT EXISTS idx_kb_articles_visibility ON public.kb_articles(visibility);

CREATE OR REPLACE FUNCTION public.can_view_doc(_vis public.doc_visibility)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user() AND (
    public.is_admin()
    OR _vis = 'all_staff'
    OR (_vis = 'management' AND public.is_staff())
    OR (_vis = 'finance'    AND public.can_view_finance())
    OR (_vis = 'planning'   AND public.can_view_planning())
    -- admin_only handled by is_admin() above
  );
$$;

-- 2) Tighten kb_articles read: visibility-aware
DROP POLICY IF EXISTS kb_articles_read ON public.kb_articles;
CREATE POLICY kb_articles_read ON public.kb_articles
  FOR SELECT TO authenticated
  USING (public.can_view_doc(visibility));

-- 3) Update chunk-retrieval functions to enforce article visibility
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector, match_count integer DEFAULT 12,
  source_filter kb_chunk_source[] DEFAULT NULL
)
RETURNS TABLE(id uuid, source_type kb_chunk_source, source_id uuid, chunk_index integer,
              title text, content text, metadata jsonb, visibility kb_chunk_visibility,
              similarity double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT c.id, c.source_type, c.source_id, c.chunk_index,
         c.title, c.content, c.metadata, c.visibility,
         1 - (c.embedding <=> query_embedding)
  FROM public.kb_chunks c
  LEFT JOIN public.kb_articles a
    ON c.source_type = 'kb_article' AND a.id = c.source_id
  WHERE c.embedding IS NOT NULL
    AND (source_filter IS NULL OR c.source_type = ANY(source_filter))
    AND (
      c.visibility = 'all'
      OR (c.visibility = 'staff' AND caller_is_staff)
      OR (c.visibility = 'admin' AND caller_is_admin)
    )
    AND (c.source_type <> 'kb_article' OR public.can_view_doc(a.visibility))
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kb_chunks_by_ids(chunk_ids uuid[])
RETURNS TABLE(id uuid, source_type kb_chunk_source, source_id uuid,
              title text, metadata jsonb, visibility kb_chunk_visibility)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_is_staff boolean := public.is_staff();
  caller_is_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT c.id, c.source_type, c.source_id, c.title, c.metadata, c.visibility
  FROM public.kb_chunks c
  LEFT JOIN public.kb_articles a
    ON c.source_type = 'kb_article' AND a.id = c.source_id
  WHERE c.id = ANY(chunk_ids)
    AND (
      c.visibility = 'all'
      OR (c.visibility = 'staff' AND caller_is_staff)
      OR (c.visibility = 'admin' AND caller_is_admin)
    )
    AND (c.source_type <> 'kb_article' OR public.can_view_doc(a.visibility));
END;
$$;

-- Patch search_kb_chunks: add visibility filter on kb_articles join
CREATE OR REPLACE FUNCTION public.search_kb_chunks(query_text text, match_count integer DEFAULT 20, source_filter kb_chunk_source[] DEFAULT NULL::kb_chunk_source[], date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, date_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, source_type kb_chunk_source, source_id uuid, chunk_index integer, title text, content text, metadata jsonb, visibility kb_chunk_visibility, rank real, match_kind text)
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
    SELECT t FROM regexp_split_to_table(q, '[^[:alnum:]]+') AS t
    WHERE length(t) >= 2
  );
  IF array_length(raw_tokens, 1) IS NULL THEN raw_tokens := ARRAY[q]; END IF;

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
      AND (c.source_type <> 'kb_article' OR public.can_view_doc(a.visibility))
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

-- 4) Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies: writes happen only via log_audit() (security definer)

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_logs(actor_id, actor_email, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _email, _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO authenticated;

-- 5) Admin bootstrap protection: only existing admins may assign or change the admin role
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;

CREATE POLICY user_roles_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage('manage_users')
    AND (role <> 'admin' OR public.is_admin())
  );

CREATE POLICY user_roles_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.can_manage('manage_users')
    AND user_id <> auth.uid()
    -- can only edit existing admin rows if you are admin
    AND (role <> 'admin' OR public.is_admin())
  )
  WITH CHECK (
    public.can_manage('manage_users')
    AND user_id <> auth.uid()
    -- the new role cannot be admin unless you are admin
    AND (role <> 'admin' OR public.is_admin())
  );

CREATE POLICY user_roles_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.can_manage('manage_users')
    AND user_id <> auth.uid()
    AND (role <> 'admin' OR public.is_admin())
  );

-- Same for permissions: only admins can grant manage_users (prevents self-escalation chain)
DROP POLICY IF EXISTS user_perms_insert ON public.user_permissions;
DROP POLICY IF EXISTS user_perms_update ON public.user_permissions;
DROP POLICY IF EXISTS user_perms_delete ON public.user_permissions;

CREATE POLICY user_perms_insert ON public.user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage('manage_users')
    AND (permission <> 'manage_users' OR public.is_admin())
  );

CREATE POLICY user_perms_update ON public.user_permissions
  FOR UPDATE TO authenticated
  USING (public.can_manage('manage_users') AND (permission <> 'manage_users' OR public.is_admin()))
  WITH CHECK (public.can_manage('manage_users') AND (permission <> 'manage_users' OR public.is_admin()));

CREATE POLICY user_perms_delete ON public.user_permissions
  FOR DELETE TO authenticated
  USING (public.can_manage('manage_users') AND (permission <> 'manage_users' OR public.is_admin()));
