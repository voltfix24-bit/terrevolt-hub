// Reindex all searchable entities into kb_chunks with embeddings.
// Admin-only: verifies the caller is an admin via their JWT.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const EMBED_MODEL = "openai/text-embedding-3-small";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

type SourceType =
  | "kb_article"
  | "news"
  | "finance_client"
  | "person"
  | "application"
  | "sharepoint_item"
  | "partner_link"
  | "quick_link"
  | "department";

type Visibility = "all" | "staff" | "admin";

type Chunk = {
  source_type: SourceType;
  source_id: string;
  chunk_index: number;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  visibility: Visibility;
  source_updated_at: string | null;
};

const FINANCE_FIELDS: { key: string; label: string }[] = [
  { key: "factuuradres", label: "Factuuradres" },
  { key: "inkooporder_info", label: "Inkooporderinformatie" },
  { key: "factuur_referenties", label: "Factuurreferenties" },
  { key: "verplichte_bijlagen", label: "Verplichte bijlagen" },
  { key: "btw_verlegd", label: "BTW verlegd" },
  { key: "g_rekening", label: "G-rekening" },
  { key: "betaaltermijn", label: "Betaaltermijn" },
  { key: "factuur_email", label: "E-mailadres voor facturen" },
  { key: "veelgemaakte_fouten", label: "Veelgemaakte fouten" },
  { key: "voorbeeld_factuurtekst", label: "Voorbeeld factuurtekst" },
  { key: "interne_opmerkingen", label: "Interne opmerkingen" },
];

const SHAREPOINT_KIND_LABEL: Record<string, string> = {
  link: "Link",
  folder: "Map",
  file: "Bestand",
  site: "Site",
};

/* -------- text helpers -------- */

function trim(s: string | null | undefined): string {
  return (s ?? "").toString().trim();
}

function joinNonEmpty(parts: Array<string | null | undefined>, sep = "\n"): string {
  return parts.map(trim).filter(Boolean).join(sep);
}

function chunkParagraphs(text: string, max = 3500, overlap = 200): string[] {
  if (text.length <= max) return [text];
  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > max) {
      if (buf) out.push(buf);
      if (p.length > max) {
        // hard split a very long paragraph
        for (let i = 0; i < p.length; i += max - overlap) {
          out.push(p.slice(i, i + max));
        }
        buf = "";
      } else {
        // start new buffer with overlap from previous
        const tail = buf.slice(-overlap);
        buf = tail ? tail + "\n\n" + p : p;
      }
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/* -------- embeddings -------- */

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Embeddings ${res.status}: ${txt}`);
  }
  const json = (await res.json()) as {
    data: Array<{ index: number; embedding: number[] }>;
  };
  // ensure ordered by index
  const ordered = new Array<number[]>(inputs.length);
  for (const d of json.data) ordered[d.index] = d.embedding;
  return ordered;
}

/* -------- builders -------- */

function buildKbArticleChunks(rows: any[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const r of rows) {
    const header = joinNonEmpty([
      r.summary ? `Samenvatting: ${r.summary}` : "",
      r.client ? `Opdrachtgever: ${r.client}` : "",
      Array.isArray(r.tags) && r.tags.length ? `Tags: ${r.tags.join(", ")}` : "",
      r.important_notes ? `Belangrijk: ${r.important_notes}` : "",
    ]);
    const bodyParts: string[] = [];
    if (trim(r.content)) bodyParts.push(trim(r.content));
    if (r.extraction_status === "ok" && trim(r.extracted_text)) {
      bodyParts.push(`Documentinhoud:\n${trim(r.extracted_text)}`);
    }
    const body = bodyParts.join("\n\n");
    const parts = body.length > 4000 ? chunkParagraphs(body, 3500, 200) : [body];
    parts.forEach((part, idx) => {
      const text = joinNonEmpty([
        idx === 0 ? header : "",
        part,
      ], "\n\n");
      chunks.push({
        source_type: "kb_article",
        source_id: r.id,
        chunk_index: idx,
        title: r.title ?? "",
        content: text || r.title || "",
        metadata: {
          section_id: r.section_id ?? null,
          slug: r.slug ?? null,
          file_url: r.file_url ?? null,
          client: r.client ?? null,
          has_pdf: !!r.file_url,
          extraction_status: r.extraction_status ?? "not_applicable",
          page_count: r.extracted_page_count ?? 0,
        },
        visibility: "all",
        source_updated_at: r.updated_at ?? null,
      });
    });
  }
  return chunks;
}

function buildNewsChunks(rows: any[]): Chunk[] {
  return rows.map((r) => ({
    source_type: "news",
    source_id: r.id,
    chunk_index: 0,
    title: r.title ?? "",
    content: joinNonEmpty([
      r.category ? `Categorie: ${r.category}` : "",
      r.summary,
      r.content,
    ], "\n\n") || (r.title ?? ""),
    metadata: {
      publish_date: r.publish_date ?? null,
      important: !!r.important,
      category: r.category ?? null,
    },
    visibility: "all",
    source_updated_at: r.updated_at ?? null,
  }));
}

function buildFinanceChunks(rows: any[]): Chunk[] {
  return rows.map((r) => {
    const parts: string[] = [];
    if (r.short_description) parts.push(r.short_description);
    for (const { key, label } of FINANCE_FIELDS) {
      const v = trim(r[key]);
      if (v) parts.push(`${label}: ${v}`);
    }
    return {
      source_type: "finance_client",
      source_id: r.id,
      chunk_index: 0,
      title: `Hoe factureer ik ${r.name}?`,
      content: parts.join("\n") || (r.name ?? ""),
      metadata: { slug: r.slug ?? null, name: r.name ?? null },
      visibility: "staff",
      source_updated_at: r.updated_at ?? null,
    };
  });
}

function buildPersonChunks(rows: any[]): Chunk[] {
  return rows.map((r) => ({
    source_type: "person",
    source_id: r.id,
    chunk_index: 0,
    title: r.full_name ?? "",
    content: joinNonEmpty([
      r.job_title ? `Functie: ${r.job_title}` : "",
      r.department ? `Afdeling: ${r.department}` : "",
      Array.isArray(r.certifications) && r.certifications.length
        ? `Certificeringen: ${r.certifications.join(", ")}`
        : "",
      r.bei_authorization ? `BEI: ${r.bei_authorization}` : "",
      r.notes,
    ]) || (r.full_name ?? ""),
    metadata: {
      person_type: r.person_type ?? null,
      department: r.department ?? null,
    },
    visibility: "all",
    source_updated_at: r.updated_at ?? null,
  }));
}

function buildApplicationChunks(rows: any[]): Chunk[] {
  return rows.map((r) => ({
    source_type: "application",
    source_id: r.id,
    chunk_index: 0,
    title: r.name ?? "",
    content: joinNonEmpty([
      r.category ? `Categorie: ${r.category}` : "",
      r.description,
    ]) || (r.name ?? ""),
    metadata: { url: r.url ?? "", new_tab: !!r.new_tab, category: r.category ?? null },
    visibility: "all",
    source_updated_at: r.updated_at ?? null,
  }));
}

function buildSharepointChunks(rows: any[]): Chunk[] {
  return rows.map((r) => ({
    source_type: "sharepoint_item",
    source_id: r.id,
    chunk_index: 0,
    title: r.name ?? "",
    content: joinNonEmpty([
      r.kind ? `Type: ${SHAREPOINT_KIND_LABEL[r.kind] ?? r.kind}` : "",
      r.description,
    ]) || (r.name ?? ""),
    metadata: { url: r.url ?? "", kind: r.kind ?? null },
    visibility: "all",
    source_updated_at: r.updated_at ?? null,
  }));
}

function buildPartnerChunks(rows: any[]): Chunk[] {
  return rows.map((r) => ({
    source_type: "partner_link",
    source_id: r.id,
    chunk_index: 0,
    title: r.name ?? "",
    content: joinNonEmpty([
      r.category ? `Categorie: ${r.category}` : "",
      r.description,
    ]) || (r.name ?? ""),
    metadata: { href: r.href ?? "", category: r.category ?? null },
    visibility: "all",
    source_updated_at: r.updated_at ?? null,
  }));
}

function buildQuickLinkChunks(rows: any[]): Chunk[] {
  return rows.map((r) => ({
    source_type: "quick_link",
    source_id: r.id,
    chunk_index: 0,
    title: r.name ?? "",
    content: r.name ?? "",
    metadata: { href: r.href ?? "" },
    visibility: "all",
    source_updated_at: r.updated_at ?? null,
  }));
}

function buildDepartmentChunks(rows: any[]): Chunk[] {
  return rows.map((r) => ({
    source_type: "department",
    source_id: r.id,
    chunk_index: 0,
    title: r.name ?? "",
    content: trim(r.description) || (r.name ?? ""),
    metadata: { name: r.name ?? null },
    visibility: "all",
    source_updated_at: r.updated_at ?? null,
  }));
}

/* -------- main -------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: "Missing Supabase env vars" });
  }
  if (!LOVABLE_API_KEY) {
    return json(500, { error: "Missing LOVABLE_API_KEY for embeddings" });
  }

  // Verify caller is admin via JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing auth" });

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Unauthorized" });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdminRow, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr || !isAdminRow) {
    return json(403, { error: "Admin only" });
  }

  const t0 = Date.now();

  try {
    // 1. Pull rows
    const [
      kb, news, fin, people, apps, sp, partners, quick, depts,
    ] = await Promise.all([
      admin.from("kb_articles").select("id,title,slug,summary,content,important_notes,client,tags,section_id,file_url,status,updated_at"),
      admin.from("news").select("id,title,category,summary,content,publish_date,important,archived,updated_at").eq("archived", false),
      admin.from("finance_clients").select("id,slug,name,short_description,factuuradres,inkooporder_info,factuur_referenties,verplichte_bijlagen,btw_verlegd,g_rekening,betaaltermijn,factuur_email,veelgemaakte_fouten,voorbeeld_factuurtekst,interne_opmerkingen,archived,updated_at").eq("archived", false),
      admin.from("people").select("id,full_name,job_title,department,person_type,certifications,bei_authorization,notes,archived,updated_at").eq("archived", false),
      admin.from("applications").select("id,name,description,category,url,new_tab,active,updated_at").eq("active", true),
      admin.from("sharepoint_items").select("id,name,description,url,kind,updated_at"),
      admin.from("partner_links").select("id,name,description,href,category,active,updated_at").eq("active", true),
      admin.from("quick_links").select("id,name,href,active,updated_at").eq("active", true),
      admin.from("departments").select("id,name,description,updated_at"),
    ]);

    const errors = [kb, news, fin, people, apps, sp, partners, quick, depts]
      .map((r) => r.error?.message)
      .filter(Boolean);
    if (errors.length) {
      return json(500, { error: "Database read failed", details: errors });
    }

    // 2. Build chunks per source
    const built: Record<SourceType, Chunk[]> = {
      kb_article: buildKbArticleChunks(kb.data ?? []),
      news: buildNewsChunks(news.data ?? []),
      finance_client: buildFinanceChunks(fin.data ?? []),
      person: buildPersonChunks(people.data ?? []),
      application: buildApplicationChunks(apps.data ?? []),
      sharepoint_item: buildSharepointChunks(sp.data ?? []),
      partner_link: buildPartnerChunks(partners.data ?? []),
      quick_link: buildQuickLinkChunks(quick.data ?? []),
      department: buildDepartmentChunks(depts.data ?? []),
    };

    const all: Chunk[] = [];
    const counts: Record<string, number> = {};
    for (const [type, list] of Object.entries(built)) {
      counts[type] = list.length;
      for (const c of list) all.push(c);
    }

    if (all.length === 0) {
      return json(200, { ok: true, total: 0, counts, duration_ms: Date.now() - t0 });
    }

    // 3. Embed in batches
    const BATCH = 64;
    const embeddings: number[][] = new Array(all.length);
    for (let i = 0; i < all.length; i += BATCH) {
      const slice = all.slice(i, i + BATCH);
      const inputs = slice.map((c) =>
        `${c.title}\n\n${c.content}`.slice(0, 8000),
      );
      const vecs = await embedBatch(inputs);
      for (let j = 0; j < vecs.length; j++) embeddings[i + j] = vecs[j];
    }

    // 4. Upsert in batches with embeddings as JSON array (pgvector accepts numeric arrays via text cast).
    const rows = all.map((c, i) => ({
      source_type: c.source_type,
      source_id: c.source_id,
      chunk_index: c.chunk_index,
      title: c.title,
      content: c.content,
      metadata: c.metadata,
      visibility: c.visibility,
      source_updated_at: c.source_updated_at,
      embedding: embeddings[i] as unknown as string,
      indexed_at: new Date().toISOString(),
    }));

    const UPSERT_BATCH = 100;
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const slice = rows.slice(i, i + UPSERT_BATCH);
      const { error } = await admin
        .from("kb_chunks")
        .upsert(slice, { onConflict: "source_type,source_id,chunk_index" });
      if (error) throw new Error(`Upsert failed: ${error.message}`);
    }

    // 5. Delete chunks whose source no longer exists or is excluded.
    // Build a set of (source_type, source_id) keys we just upserted.
    const validKeys = new Set(
      all.map((c) => `${c.source_type}:${c.source_id}`),
    );
    const { data: existing, error: listErr } = await admin
      .from("kb_chunks")
      .select("id,source_type,source_id");
    if (listErr) throw new Error(`List failed: ${listErr.message}`);
    const stale = (existing ?? []).filter(
      (r) => !validKeys.has(`${r.source_type}:${r.source_id}`),
    );
    if (stale.length > 0) {
      const ids = stale.map((r) => r.id);
      const DEL_BATCH = 200;
      for (let i = 0; i < ids.length; i += DEL_BATCH) {
        const slice = ids.slice(i, i + DEL_BATCH);
        const { error } = await admin.from("kb_chunks").delete().in("id", slice);
        if (error) throw new Error(`Delete failed: ${error.message}`);
      }
    }

    // 6. Backfill vraagbaak_questions embeddings (active rows without one)
    let backfilled = 0;
    const { data: pending } = await admin
      .from("vraagbaak_questions")
      .select("id,question")
      .is("question_embedding", null)
      .is("invalidated_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(500);
    const pendingRows = (pending ?? []) as Array<{ id: string; question: string }>;
    for (let i = 0; i < pendingRows.length; i += BATCH) {
      const slice = pendingRows.slice(i, i + BATCH);
      const vecs = await embedBatch(slice.map((r) => r.question.slice(0, 8000)));
      await Promise.all(
        slice.map((r, j) =>
          admin
            .from("vraagbaak_questions")
            .update({ question_embedding: vecs[j] as unknown as string })
            .eq("id", r.id),
        ),
      );
      backfilled += slice.length;
    }

    return json(200, {
      ok: true,
      total: all.length,
      counts,
      removed: stale.length,
      backfilled_questions: backfilled,
      duration_ms: Date.now() - t0,
    });

  } catch (err) {
    console.error("reindex_all error", err);
    return json(500, { error: (err as Error).message });
  }
});
