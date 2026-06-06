import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type KbChunkSource =
  | "kb_article"
  | "news"
  | "finance_client"
  | "person"
  | "application"
  | "sharepoint_item"
  | "partner_link"
  | "quick_link"
  | "department";

export type KbVisibility = "all" | "staff" | "admin";

export type MatchKind =
  | "title_exact"
  | "title_contains"
  | "title_all_tokens"
  | "title_token"
  | "tag_or_category"
  | "fts_content"
  | "content_phrase"
  | "content_token";

export type ResolvedSource = {
  source_type: KbChunkSource;
  source_id: string;
  title: string;
  url: string;
  external: boolean;
  similarity: number;
  snippet?: string;
  match_kind?: MatchKind;
  is_question?: boolean;
};

export type VraagbaakAnswer = {
  short_answer: string;
  steps: string[];
  summary: string;
  follow_ups: string[];
  sources: ResolvedSource[];
  suggestions: ResolvedSource[];
  direct_answer?: {
    title: string;
    content: string;
    url: string;
    external: boolean;
    source_type: KbChunkSource;
  };
  has_sources: boolean;
  cached: boolean;
  cache_age_days?: number;
  cache_similarity?: number;
  question_id?: string;
};

const SOURCE_TYPES = [
  "kb_article",
  "news",
  "finance_client",
  "person",
  "application",
  "sharepoint_item",
  "partner_link",
  "quick_link",
  "department",
] as const;

const Input = z.object({
  question: z.string().trim().min(2).max(2000),
  force_fresh: z.boolean().optional(),
  source_types: z.array(z.enum(SOURCE_TYPES)).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

const NO_SOURCE =
  "Ik kon geen passende interne bron vinden. Probeer andere zoekwoorden of vraag dit na bij de verantwoordelijke.";
const FOUND_PREFIX = "Ik heb deze interne bronnen gevonden:";

type SearchRow = {
  id: string;
  source_type: KbChunkSource;
  source_id: string;
  chunk_index: number;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  visibility: KbVisibility;
  rank: number;
  match_kind: MatchKind;
};

type SupabaseLike = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    select: (cols: string) => {
      in: (col: string, vals: string[]) => Promise<{ data: unknown; error: unknown }>;
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};

function buildSnippet(content: string, q: string, len = 220): string {
  const text = (content || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  let idx = -1;
  for (const t of terms) {
    idx = lower.indexOf(t);
    if (idx !== -1) break;
  }
  if (idx === -1) return text.slice(0, len) + (text.length > len ? "…" : "");
  const start = Math.max(0, idx - 70);
  const end = Math.min(text.length, start + len);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export const askVraagbaak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<VraagbaakAnswer> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const userId = (context as { userId?: string }).userId;
    const question = data.question.trim();
    const filters = {
      source_types: data.source_types ?? null,
      date_from: data.date_from ?? null,
      date_to: data.date_to ?? null,
    };

    const { data: matches, error } = await supabase.rpc("search_kb_chunks", {
      query_text: question,
      match_count: 12,
      source_filter: filters.source_types,
      date_from: filters.date_from,
      date_to: filters.date_to,
    });

    if (error) {
      console.error("search_kb_chunks error", error);
      return {
        short_answer: "Kon de kennisbank niet doorzoeken. Probeer het later opnieuw.",
        steps: [],
        summary: "",
        follow_ups: [],
        sources: [],
        has_sources: false,
        cached: false,
      };
    }

    const rows = ((matches as SearchRow[] | null) ?? []).slice(0, 10);
    if (rows.length === 0) {
      // log miss (best-effort)
      try {
        await supabase.from("search_misses").insert({
          user_id: userId ?? null,
          query: question,
          filters,
        });
      } catch (e) {
        console.error("search_misses insert error", e);
      }
      return {
        short_answer: NO_SOURCE,
        steps: [],
        summary: "",
        follow_ups: [],
        sources: [],
        has_sources: false,
        cached: false,
      };
    }

    const resolver = await buildUrlResolver(supabase, rows);
    const sources: ResolvedSource[] = rows.map((r) => {
      const { url, external } = resolver(r);
      return {
        source_type: r.source_type,
        source_id: r.source_id,
        title: r.title,
        url,
        external,
        similarity: Number(r.rank) || 0,
        snippet: buildSnippet(r.content, question),
        match_kind: r.match_kind,
      };
    });

    return {
      short_answer: FOUND_PREFIX,
      steps: [],
      summary: "",
      follow_ups: [],
      sources,
      has_sources: true,
      cached: false,
    };
  });

/* -------- helpers -------- */

async function buildUrlResolver(
  supabase: SupabaseLike,
  rows: SearchRow[],
): Promise<(r: SearchRow) => { url: string; external: boolean }> {
  const kbIds = new Set(
    rows.filter((r) => r.source_type === "kb_article").map((r) => r.source_id),
  );
  type KbArt = { id: string; slug: string; section_id: string };
  type Section = { id: string; slug: string };
  let kbBySource = new Map<string, KbArt>();
  let sectionById = new Map<string, Section>();
  if (kbIds.size > 0) {
    const arts = await supabase
      .from("kb_articles")
      .select("id,slug,section_id")
      .in("id", Array.from(kbIds));
    const sectionIds = new Set<string>();
    kbBySource = new Map(
      ((arts.data as KbArt[] | null) ?? []).map((a) => {
        if (a.section_id) sectionIds.add(a.section_id);
        return [a.id, a];
      }),
    );
    if (sectionIds.size > 0) {
      const secs = await supabase
        .from("kb_sections")
        .select("id,slug")
        .in("id", Array.from(sectionIds));
      sectionById = new Map(((secs.data as Section[] | null) ?? []).map((s) => [s.id, s]));
    }
  }

  return (r: SearchRow) => {
    const meta = r.metadata ?? {};
    switch (r.source_type) {
      case "kb_article": {
        const art = kbBySource.get(r.source_id);
        const sec = art ? sectionById.get(art.section_id) : undefined;
        if (art && sec) return { url: `/kennisbank/${sec.slug}/${art.slug}`, external: false };
        return { url: "/kennisbank", external: false };
      }
      case "news":
        return { url: `/nieuws#${r.source_id}`, external: false };
      case "finance_client":
        return { url: `/finance-wiki/${meta.slug ?? ""}`, external: false };
      case "person":
        return { url: `/smoelenboek/${r.source_id}`, external: false };
      case "application": {
        const url = String(meta.url ?? "/");
        return { url, external: !!meta.new_tab || url.startsWith("http") };
      }
      case "sharepoint_item":
        return { url: String(meta.url ?? ""), external: true };
      case "partner_link":
        return { url: String(meta.href ?? ""), external: true };
      case "quick_link":
        return { url: String(meta.href ?? ""), external: true };
      case "department":
        return {
          url: `/smoelenboek?dept=${encodeURIComponent(String(meta.name ?? ""))}`,
          external: false,
        };
    }
  };
}
