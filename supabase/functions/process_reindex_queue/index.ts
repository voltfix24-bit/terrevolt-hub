// Process the reindex_queue outbox: pick pending items, (re)index or delete chunks.
// Triggered by pg_cron every minute with service-role bearer.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const EMBED_MODEL = "openai/text-embedding-3-small";
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

type SourceType =
  | "kb_article" | "news" | "finance_client" | "person"
  | "application" | "sharepoint_item" | "partner_link" | "quick_link" | "department";
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

const FINANCE_FIELDS = [
  ["factuuradres", "Factuuradres"],
  ["inkooporder_info", "Inkooporderinformatie"],
  ["factuur_referenties", "Factuurreferenties"],
  ["verplichte_bijlagen", "Verplichte bijlagen"],
  ["btw_verlegd", "BTW verlegd"],
  ["g_rekening", "G-rekening"],
  ["betaaltermijn", "Betaaltermijn"],
  ["factuur_email", "E-mailadres voor facturen"],
  ["veelgemaakte_fouten", "Veelgemaakte fouten"],
  ["voorbeeld_factuurtekst", "Voorbeeld factuurtekst"],
  ["interne_opmerkingen", "Interne opmerkingen"],
] as const;

const SHAREPOINT_KIND_LABEL: Record<string, string> = {
  link: "Link", folder: "Map", file: "Bestand", site: "Site",
};

const trim = (s: any) => (s ?? "").toString().trim();
const joinNonEmpty = (parts: any[], sep = "\n") =>
  parts.map(trim).filter(Boolean).join(sep);

function chunkParagraphs(text: string, max = 3500, overlap = 200): string[] {
  if (text.length <= max) return [text];
  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > max) {
      if (buf) out.push(buf);
      if (p.length > max) {
        for (let i = 0; i < p.length; i += max - overlap) out.push(p.slice(i, i + max));
        buf = "";
      } else {
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

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Embeddings ${res.status}: ${txt}`);
  }
  const j = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
  const ordered = new Array<number[]>(inputs.length);
  for (const d of j.data) ordered[d.index] = d.embedding;
  return ordered;
}

/* ---------- builders per source (single row) ---------- */

function buildKbArticle(r: any): Chunk[] {
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
  return parts.map((part, idx) => ({
    source_type: "kb_article",
    source_id: r.id,
    chunk_index: idx,
    title: r.title ?? "",
    content: joinNonEmpty([idx === 0 ? header : "", part], "\n\n") || r.title || "",
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
  }));
}

function buildNews(r: any): Chunk[] {
  if (r.archived) return [];
  return [{
    source_type: "news", source_id: r.id, chunk_index: 0,
    title: r.title ?? "",
    content: joinNonEmpty([
      r.category ? `Categorie: ${r.category}` : "", r.summary, r.content,
    ], "\n\n") || (r.title ?? ""),
    metadata: { publish_date: r.publish_date ?? null, important: !!r.important, category: r.category ?? null },
    visibility: "all", source_updated_at: r.updated_at ?? null,
  }];
}

function buildFinance(r: any): Chunk[] {
  if (r.archived) return [];
  const parts: string[] = [];
  if (r.short_description) parts.push(r.short_description);
  for (const [k, label] of FINANCE_FIELDS) {
    const v = trim(r[k]);
    if (v) parts.push(`${label}: ${v}`);
  }
  return [{
    source_type: "finance_client", source_id: r.id, chunk_index: 0,
    title: `Hoe factureer ik ${r.name}?`,
    content: parts.join("\n") || (r.name ?? ""),
    metadata: { slug: r.slug ?? null, name: r.name ?? null },
    visibility: "staff", source_updated_at: r.updated_at ?? null,
  }];
}

function buildPerson(r: any): Chunk[] {
  if (r.archived) return [];
  return [{
    source_type: "person", source_id: r.id, chunk_index: 0,
    title: r.full_name ?? "",
    content: joinNonEmpty([
      r.job_title ? `Functie: ${r.job_title}` : "",
      r.department ? `Afdeling: ${r.department}` : "",
      Array.isArray(r.certifications) && r.certifications.length ? `Certificeringen: ${r.certifications.join(", ")}` : "",
      r.bei_authorization ? `BEI: ${r.bei_authorization}` : "",
      r.notes,
    ]) || (r.full_name ?? ""),
    metadata: { person_type: r.person_type ?? null, department: r.department ?? null },
    visibility: "all", source_updated_at: r.updated_at ?? null,
  }];
}

function buildApplication(r: any): Chunk[] {
  if (!r.active) return [];
  return [{
    source_type: "application", source_id: r.id, chunk_index: 0,
    title: r.name ?? "",
    content: joinNonEmpty([r.category ? `Categorie: ${r.category}` : "", r.description]) || (r.name ?? ""),
    metadata: { url: r.url ?? "", new_tab: !!r.new_tab, category: r.category ?? null },
    visibility: "all", source_updated_at: r.updated_at ?? null,
  }];
}

function buildSharepoint(r: any): Chunk[] {
  return [{
    source_type: "sharepoint_item", source_id: r.id, chunk_index: 0,
    title: r.name ?? "",
    content: joinNonEmpty([
      r.kind ? `Type: ${SHAREPOINT_KIND_LABEL[r.kind] ?? r.kind}` : "", r.description,
    ]) || (r.name ?? ""),
    metadata: { url: r.url ?? "", kind: r.kind ?? null },
    visibility: "all", source_updated_at: r.updated_at ?? null,
  }];
}

function buildPartner(r: any): Chunk[] {
  if (!r.active) return [];
  return [{
    source_type: "partner_link", source_id: r.id, chunk_index: 0,
    title: r.name ?? "",
    content: joinNonEmpty([r.category ? `Categorie: ${r.category}` : "", r.description]) || (r.name ?? ""),
    metadata: { href: r.href ?? "", category: r.category ?? null },
    visibility: "all", source_updated_at: r.updated_at ?? null,
  }];
}

function buildQuick(r: any): Chunk[] {
  if (!r.active) return [];
  return [{
    source_type: "quick_link", source_id: r.id, chunk_index: 0,
    title: r.name ?? "", content: r.name ?? "",
    metadata: { href: r.href ?? "" },
    visibility: "all", source_updated_at: r.updated_at ?? null,
  }];
}

function buildDepartment(r: any): Chunk[] {
  return [{
    source_type: "department", source_id: r.id, chunk_index: 0,
    title: r.name ?? "",
    content: trim(r.description) || (r.name ?? ""),
    metadata: { name: r.name ?? null },
    visibility: "all", source_updated_at: r.updated_at ?? null,
  }];
}

const TABLE_MAP: Record<SourceType, { table: string; cols: string; build: (r: any) => Chunk[] }> = {
  kb_article: {
    table: "kb_articles",
    cols: "id,title,slug,summary,content,important_notes,client,tags,section_id,file_url,status,updated_at,extracted_text,extraction_status,extracted_page_count",
    build: buildKbArticle,
  },
  news: { table: "news", cols: "id,title,category,summary,content,publish_date,important,archived,updated_at", build: buildNews },
  finance_client: {
    table: "finance_clients",
    cols: "id,slug,name,short_description,factuuradres,inkooporder_info,factuur_referenties,verplichte_bijlagen,btw_verlegd,g_rekening,betaaltermijn,factuur_email,veelgemaakte_fouten,voorbeeld_factuurtekst,interne_opmerkingen,archived,updated_at",
    build: buildFinance,
  },
  person: {
    table: "people",
    cols: "id,full_name,job_title,department,person_type,certifications,bei_authorization,notes,archived,updated_at",
    build: buildPerson,
  },
  application: { table: "applications", cols: "id,name,description,category,url,new_tab,active,updated_at", build: buildApplication },
  sharepoint_item: { table: "sharepoint_items", cols: "id,name,description,url,kind,updated_at", build: buildSharepoint },
  partner_link: { table: "partner_links", cols: "id,name,description,href,category,active,updated_at", build: buildPartner },
  quick_link: { table: "quick_links", cols: "id,name,href,active,updated_at", build: buildQuick },
  department: { table: "departments", cols: "id,name,description,updated_at", build: buildDepartment },
};

async function indexSingleRow(admin: any, sourceType: SourceType, sourceId: string): Promise<number> {
  const def = TABLE_MAP[sourceType];
  if (!def) throw new Error(`Unknown source_type: ${sourceType}`);
  const { data: row, error } = await admin.from(def.table).select(def.cols).eq("id", sourceId).maybeSingle();
  if (error) throw new Error(`Read ${def.table} failed: ${error.message}`);
  if (!row) {
    // Source is gone — treat as delete
    await admin.from("kb_chunks").delete().eq("source_type", sourceType).eq("source_id", sourceId);
    return 0;
  }
  const chunks = def.build(row);
  if (chunks.length === 0) {
    // Filtered out (archived/inactive) — clean up
    await admin.from("kb_chunks").delete().eq("source_type", sourceType).eq("source_id", sourceId);
    return 0;
  }
  const vecs = await embedBatch(chunks.map((c) => `${c.title}\n\n${c.content}`.slice(0, 8000)));
  const rows = chunks.map((c, i) => ({
    source_type: c.source_type, source_id: c.source_id, chunk_index: c.chunk_index,
    title: c.title, content: c.content, metadata: c.metadata,
    visibility: c.visibility, source_updated_at: c.source_updated_at,
    embedding: vecs[i] as unknown as string,
    indexed_at: new Date().toISOString(),
  }));
  const { error: upErr } = await admin
    .from("kb_chunks")
    .upsert(rows, { onConflict: "source_type,source_id,chunk_index" });
  if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);

  // Cleanup orphan chunks (when new content produced fewer chunks than before)
  const maxIdx = chunks.length - 1;
  const { error: delErr } = await admin
    .from("kb_chunks")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .gt("chunk_index", maxIdx);
  if (delErr) throw new Error(`Cleanup failed: ${delErr.message}`);

  return chunks.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!SUPABASE_URL || !SERVICE_ROLE || !LOVABLE_API_KEY) {
    return json(500, { error: "Missing env vars" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const t0 = Date.now();

  const { data: items, error } = await admin
    .from("reindex_queue")
    .select("*")
    .lt("attempts", MAX_ATTEMPTS)
    .order("enqueued_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return json(500, { error: error.message });
  if (!items || items.length === 0) {
    return json(200, { ok: true, processed: 0, duration_ms: Date.now() - t0 });
  }

  const results = { processed: 0, deleted: 0, failed: 0, chunks: 0 };

  for (const item of items as any[]) {
    try {
      if (item.operation === "delete") {
        const { error: delErr } = await admin
          .from("kb_chunks").delete()
          .eq("source_type", item.source_type)
          .eq("source_id", item.source_id);
        if (delErr) throw new Error(delErr.message);
        results.deleted++;
      } else {
        const n = await indexSingleRow(admin, item.source_type, item.source_id);
        results.chunks += n;
        results.processed++;
      }
      await admin.from("reindex_queue").delete().eq("id", item.id);
    } catch (e) {
      results.failed++;
      const msg = String((e as Error)?.message ?? e).slice(0, 500);
      await admin.from("reindex_queue").update({
        attempts: item.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        last_error: msg,
      }).eq("id", item.id);
      console.error("queue item failed", item.source_type, item.source_id, msg);
    }
  }

  return json(200, { ok: true, ...results, duration_ms: Date.now() - t0 });
});
