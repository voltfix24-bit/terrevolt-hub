// Extract text from PDFs uploaded to kb-documents bucket.
// Admin-only: verifies caller via JWT.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const MIN_CHARS_PER_PAGE = 50;
const BATCH_LIMIT = 20;

type Article = {
  id: string;
  file_path: string;
  file_url: string;
  file_size: number;
  extracted_file_size: number;
  extraction_status: string;
};

async function extractOne(
  admin: ReturnType<typeof createClient>,
  articleId: string,
  force: boolean,
) {
  const { data: article, error } = await admin
    .from("kb_articles")
    .select(
      "id, file_path, file_url, file_size, extracted_file_size, extraction_status",
    )
    .eq("id", articleId)
    .maybeSingle();
  if (error) return { id: articleId, status: "failed", error: error.message };
  if (!article) return { id: articleId, status: "not_found" };
  const a = article as unknown as Article;

  if (!a.file_path) {
    await admin
      .from("kb_articles")
      .update({
        extraction_status: "not_applicable",
        extracted_text: "",
        extraction_error: "",
      })
      .eq("id", articleId);
    return { id: articleId, status: "not_applicable" };
  }

  if (
    !force &&
    a.extraction_status === "ok" &&
    a.extracted_file_size === a.file_size
  ) {
    return { id: articleId, status: "unchanged" };
  }

  if (!a.file_path.toLowerCase().endsWith(".pdf")) {
    await admin
      .from("kb_articles")
      .update({
        extraction_status: "not_applicable",
        extracted_text: "",
        extracted_at: new Date().toISOString(),
        extracted_file_size: a.file_size,
        extraction_error: "",
      })
      .eq("id", articleId);
    return { id: articleId, status: "not_applicable" };
  }

  if (a.file_size > MAX_BYTES) {
    await admin
      .from("kb_articles")
      .update({
        extraction_status: "too_large",
        extracted_text: "",
        extraction_error: `File too large: ${Math.round(a.file_size / 1024 / 1024)}MB`,
        extracted_at: new Date().toISOString(),
        extracted_file_size: a.file_size,
      })
      .eq("id", articleId);
    return { id: articleId, status: "too_large" };
  }

  try {
    const { data: blob, error: dlErr } = await admin.storage
      .from("kb-documents")
      .download(a.file_path);
    if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message ?? "no blob"}`);

    const buf = new Uint8Array(await blob.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const cleanText = String(text).replace(/\s+/g, " ").trim();

    const charsPerPage = totalPages > 0 ? cleanText.length / totalPages : 0;
    if (charsPerPage < MIN_CHARS_PER_PAGE) {
      await admin
        .from("kb_articles")
        .update({
          extraction_status: "scanned",
          extracted_text: cleanText,
          extracted_page_count: totalPages,
          extracted_at: new Date().toISOString(),
          extracted_file_size: a.file_size,
          extraction_error: "",
        })
        .eq("id", articleId);
      return { id: articleId, status: "scanned", pages: totalPages, chars: cleanText.length };
    }

    await admin
      .from("kb_articles")
      .update({
        extraction_status: "ok",
        extracted_text: cleanText,
        extracted_page_count: totalPages,
        extracted_at: new Date().toISOString(),
        extracted_file_size: a.file_size,
        extraction_error: "",
      })
      .eq("id", articleId);
    return { id: articleId, status: "ok", pages: totalPages, chars: cleanText.length };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).slice(0, 500);
    await admin
      .from("kb_articles")
      .update({
        extraction_status: "failed",
        extraction_error: msg,
        extracted_at: new Date().toISOString(),
        extracted_file_size: a.file_size,
      })
      .eq("id", articleId);
    return { id: articleId, status: "failed", error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: "Missing Supabase env vars" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing auth" });

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdminRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .eq("active", true)
    .maybeSingle();
  if (!isAdminRow) return json(403, { error: "Admin only" });

  let body: { article_id?: string; all_pending?: boolean; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body allowed
  }

  try {
    if (body.article_id) {
      const result = await extractOne(admin, body.article_id, !!body.force);
      return json(200, { processed: 1, results: [result] });
    }

    if (body.all_pending) {
      const { data: pending, error: pErr } = await admin
        .from("kb_articles")
        .select("id")
        .eq("extraction_status", "pending")
        .limit(BATCH_LIMIT);
      if (pErr) throw new Error(pErr.message);
      const ids = ((pending ?? []) as Array<{ id: string }>).map((r) => r.id);
      const results: unknown[] = [];
      for (const id of ids) {
        results.push(await extractOne(admin, id, false));
      }
      return json(200, {
        processed: ids.length,
        remaining_hint: ids.length === BATCH_LIMIT,
        results,
      });
    }

    return json(400, { error: "Provide article_id or all_pending" });
  } catch (err) {
    console.error("extract_pdf_text error", err);
    return json(500, { error: (err as Error).message });
  }
});
