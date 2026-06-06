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

export type ResolvedSource = {
  source_type: KbChunkSource;
  source_id: string;
  title: string;
  url: string;
  external: boolean;
  similarity: number;
};

export type VraagbaakAnswer = {
  short_answer: string;
  steps: string[];
  summary: string;
  follow_ups: string[];
  sources: ResolvedSource[];
  has_sources: boolean;
};

const Input = z.object({
  question: z.string().min(1).max(2000),
});

const NO_SOURCE =
  "Ik kan dit niet met zekerheid vinden in de kennisbank. Controleer de originele documenten of vraag dit na bij de verantwoordelijke.";

function extractJson(text: string): unknown | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(candidate.slice(first, last + 1));
  } catch {
    return null;
  }
}

const fallback = (short: string): VraagbaakAnswer => ({
  short_answer: short,
  steps: [],
  summary: "",
  follow_ups: [],
  sources: [],
  has_sources: false,
});

export const askVraagbaak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<VraagbaakAnswer> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return fallback("De AI-assistent is nog niet geactiveerd. Stel LOVABLE_API_KEY in.");
    }
    const { supabase } = context;


    // 1. Embed the question
    let queryEmbedding: number[];
    try {
      const er = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "openai/text-embedding-3-small",
          input: data.question,
        }),
      });
      if (!er.ok) {
        if (er.status === 429)
          return fallback("Te veel verzoeken. Probeer het zo dadelijk opnieuw.");
        if (er.status === 402)
          return fallback("Het AI-tegoed is op. Voeg credits toe in workspace-instellingen.");
        throw new Error(`Embeddings ${er.status}`);
      }
      const ej = (await er.json()) as { data: Array<{ embedding: number[] }> };
      queryEmbedding = ej.data?.[0]?.embedding ?? [];
      if (!queryEmbedding.length) throw new Error("empty embedding");
    } catch (err) {
      console.error("embed error", err);
      return fallback("Kon de vraag niet verwerken. Probeer het later opnieuw.");
    }

    // 2. Semantic search via RPC (RLS applies via SECURITY DEFINER + caller role)
    const { data: matches, error: matchErr } = await (supabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("match_kb_chunks", {
      query_embedding: queryEmbedding,
      match_count: 12,
    });
    if (matchErr) {
      console.error("match_kb_chunks error", matchErr);
      return fallback("Kon de kennisbank niet doorzoeken. Probeer het later opnieuw.");
    }
    type MatchRow = {
      id: string;
      source_type: KbChunkSource;
      source_id: string;
      chunk_index: number;
      title: string;
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    };
    const rows = (matches as MatchRow[] | null) ?? [];
    if (rows.length === 0) {
      return fallback(NO_SOURCE);
    }

    // 3. Resolve URLs that need extra DB lookups (slugs)
    const kbIds = new Set(
      rows.filter((r) => r.source_type === "kb_article").map((r) => r.source_id),
    );
    const sectionIds = new Set<string>();
    type KbArt = { id: string; slug: string; section_id: string };
    type Section = { id: string; slug: string };
    let kbBySource = new Map<string, KbArt>();
    let sectionById = new Map<string, Section>();
    if (kbIds.size > 0) {
      const { data: arts } = await supabase
        .from("kb_articles")
        .select("id,slug,section_id")
        .in("id", Array.from(kbIds));
      kbBySource = new Map(
        ((arts as KbArt[] | null) ?? []).map((a) => {
          if (a.section_id) sectionIds.add(a.section_id);
          return [a.id, a];
        }),
      );
      if (sectionIds.size > 0) {
        const { data: secs } = await supabase
          .from("kb_sections")
          .select("id,slug")
          .in("id", Array.from(sectionIds));
        sectionById = new Map(((secs as Section[] | null) ?? []).map((s) => [s.id, s]));
      }
    }

    function buildSourceUrl(r: MatchRow): { url: string; external: boolean } {
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
    }

    // 4. Build LLM context
    const docs = rows
      .map((r, i) => {
        const meta = Object.entries(r.metadata ?? {})
          .filter(([, v]) => v !== null && v !== "" && v !== undefined)
          .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join(" · ");
        const body = (r.content || "").slice(0, 1800);
        return `### [${i + 1}] ${r.title} (${r.source_type})\nMeta: ${meta}\n${body}`;
      })
      .join("\n\n");

    const system = `Je bent de TerreVolt Vraagbaak. Beantwoord vragen kort, helder en uitsluitend in het Nederlands.

REGELS:
- Baseer je antwoord UITSLUITEND op de meegegeven documenten.
- Als het antwoord niet (volledig) in de documenten staat, schrijf in "short_answer": "${NO_SOURCE}"
- Werkwijze bronvermelding:
  1) Bepaal "source_indices": de documentnummers (zoals [1], [2]...) die je daadwerkelijk gebruikt, in citatievolgorde.
  2) Voeg in "short_answer", elke stap in "steps" en in "summary" inline citaten toe in de vorm [k], waar k de POSITIE in source_indices is (1-gebaseerd).
  3) Elke zin met inhoudelijke informatie krijgt minimaal één [k]-citaat.
- Antwoord altijd in geldige JSON met dit exacte schema:
{
  "short_answer": string,
  "steps": string[],
  "summary": string,
  "follow_ups": string[],
  "source_indices": number[]
}
- Geen markdown buiten de JSON, geen uitleg buiten de JSON.`;

    const userPrompt = `Documenten:\n${docs}\n\nVraag: ${data.question}\n\nGeef nu het JSON-antwoord.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "openai/gpt-5.2",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        if (res.status === 429) return fallback("Te veel verzoeken. Probeer het zo dadelijk opnieuw.");
        if (res.status === 402)
          return fallback("Het AI-tegoed is op. Voeg credits toe in workspace-instellingen.");
        throw new Error(`AI gateway ${res.status}`);
      }
      const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = j.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(raw) as {
        short_answer?: string;
        steps?: string[];
        summary?: string;
        follow_ups?: string[];
        source_indices?: number[];
      } | null;

      if (!parsed || typeof parsed.short_answer !== "string") {
        return fallback(raw.trim() || NO_SOURCE);
      }
      const indices = Array.isArray(parsed.source_indices) ? parsed.source_indices : [];
      const sources: ResolvedSource[] = indices
        .map((i) => rows[i - 1])
        .filter(Boolean)
        .map((r) => {
          const { url, external } = buildSourceUrl(r);
          return {
            source_type: r.source_type,
            source_id: r.source_id,
            title: r.title,
            url,
            external,
            similarity: r.similarity,
          };
        });

      const isNoSource =
        parsed.short_answer.trim() === NO_SOURCE || sources.length === 0;

      return {
        short_answer: parsed.short_answer.trim(),
        steps: Array.isArray(parsed.steps) ? parsed.steps.filter(Boolean).slice(0, 6) : [],
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        follow_ups: Array.isArray(parsed.follow_ups)
          ? parsed.follow_ups.filter(Boolean).slice(0, 4)
          : [],
        sources,
        has_sources: !isNoSource,
      };
    } catch (err) {
      console.error("vraagbaak LLM error", err);
      return fallback("Er ging iets mis bij het ophalen van het antwoord. Probeer het later opnieuw.");
    }
  });
