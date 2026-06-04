import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ContextDoc = z.object({
  id: z.string(),
  title: z.string(),
  section: z.string().optional(),
  client: z.string().optional(),
  document_type: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  valid_until: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});

const Input = z.object({
  question: z.string().min(1).max(2000),
  context: z.array(ContextDoc).max(20),
});

export type VraagbaakAnswer = {
  short_answer: string;
  steps: string[];
  summary: string;
  follow_ups: string[];
  source_ids: string[];
  has_sources: boolean;
};

const NO_SOURCE =
  "Ik kan dit niet met zekerheid vinden in de kennisbank. Controleer de originele documenten of vraag dit na bij de verantwoordelijke.";

function extractJson(text: string): unknown | null {
  // Try fenced block first
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

export const askVraagbaak = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<VraagbaakAnswer> => {
    const key = process.env.LOVABLE_API_KEY;
    const hasContext = data.context.length > 0;

    // Placeholder fallback if AI not configured
    if (!key) {
      return {
        short_answer: hasContext
          ? "De AI-assistent is nog niet geactiveerd. Hieronder vind je documenten die mogelijk relevant zijn voor je vraag."
          : NO_SOURCE,
        steps: hasContext
          ? [
              "Open een van de bronnen hieronder.",
              "Controleer de meest recente versie en geldigheidsdatum.",
              "Vraag bij twijfel na bij de verantwoordelijke.",
            ]
          : [],
        summary: "",
        follow_ups: [
          "Wie is verantwoordelijk voor dit onderwerp?",
          "Is er een recentere versie van dit document?",
        ],
        source_ids: data.context.map((d) => d.id),
        has_sources: hasContext,
      };
    }

    if (!hasContext) {
      return {
        short_answer: NO_SOURCE,
        steps: [],
        summary: "",
        follow_ups: [],
        source_ids: [],
        has_sources: false,
      };
    }

    const docs = data.context
      .map((d, i) => {
        const meta = [d.section, d.client, d.document_type, d.updated_at?.slice(0, 10)]
          .filter(Boolean)
          .join(" · ");
        const body = (d.summary || d.content || "").slice(0, 1500);
        return `### [${i + 1}] ${d.title}\nMeta: ${meta}\n${body}`;
      })
      .join("\n\n");

    const system = `Je bent de TerreVolt Vraagbaak. Beantwoord vragen kort, helder en uitsluitend in het Nederlands.

REGELS:
- Baseer je antwoord UITSLUITEND op de meegegeven documenten.
- Als het antwoord niet (volledig) in de documenten staat, schrijf in "short_answer": "${NO_SOURCE}"
- Presenteer het antwoord NOOIT als definitieve waarheid zonder bron.
- Werkwijze bronvermelding (BELANGRIJK):
  1) Bepaal eerst "source_indices": de documentnummers (zoals [1], [2]... in de Documenten-lijst hieronder) die je daadwerkelijk gebruikt, in de volgorde waarin je ze voor het eerst citeert.
  2) Voeg in "short_answer", elke stap in "steps" en in "summary" inline citaten toe in de vorm [k]. Hier verwijst k naar de POSITIE in "source_indices" (1-gebaseerd), NIET naar het originele documentnummer.
  3) Plaats [k] direct achter de zin of zinsdeel die op die bron is gebaseerd, vóór de punt. Meerdere bronnen mag: bijv. "...zoals beschreven [1][2].".
  4) Elke zin met inhoudelijke informatie krijgt minimaal één [k]-citaat.
- Antwoord altijd in geldige JSON met dit exacte schema:
{
  "short_answer": string,        // 1-3 zinnen met inline [k] citaten
  "steps": string[],             // optioneel stappenplan met [k] citaten, max 6 stappen
  "summary": string,             // korte samenvatting met [k] citaten, optioneel
  "follow_ups": string[],        // 2-3 logische vervolgvragen (zonder [k])
  "source_indices": number[]     // documentnummers in citatievolgorde
}
- Geen markdown buiten de JSON, geen uitleg buiten de JSON.`;

    const userPrompt = `Documenten:\n${docs}\n\nVraag: ${data.question}\n\nGeef nu het JSON-antwoord.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
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
        if (res.status === 429) {
          return {
            short_answer: "Te veel verzoeken op dit moment. Probeer het zo dadelijk opnieuw.",
            steps: [],
            summary: "",
            follow_ups: [],
            source_ids: [],
            has_sources: false,
          };
        }
        if (res.status === 402) {
          return {
            short_answer:
              "Het AI-tegoed is op. Voeg credits toe in workspace-instellingen om door te gaan.",
            steps: [],
            summary: "",
            follow_ups: [],
            source_ids: [],
            has_sources: false,
          };
        }
        throw new Error(`AI gateway ${res.status}`);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(raw) as
        | {
            short_answer?: string;
            steps?: string[];
            summary?: string;
            follow_ups?: string[];
            source_indices?: number[];
          }
        | null;

      if (!parsed || typeof parsed.short_answer !== "string") {
        return {
          short_answer: raw.trim() || NO_SOURCE,
          steps: [],
          summary: "",
          follow_ups: [],
          source_ids: data.context.map((d) => d.id),
          has_sources: true,
        };
      }

      const indices = Array.isArray(parsed.source_indices) ? parsed.source_indices : [];
      const sourceIds = indices
        .map((i) => data.context[i - 1]?.id)
        .filter((x): x is string => !!x);

      const isNoSource =
        parsed.short_answer.trim() === NO_SOURCE || sourceIds.length === 0;

      return {
        short_answer: parsed.short_answer.trim(),
        steps: Array.isArray(parsed.steps) ? parsed.steps.filter(Boolean).slice(0, 6) : [],
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        follow_ups: Array.isArray(parsed.follow_ups)
          ? parsed.follow_ups.filter(Boolean).slice(0, 4)
          : [],
        source_ids: sourceIds,
        has_sources: !isNoSource,
      };
    } catch (err) {
      console.error("vraagbaak error", err);
      return {
        short_answer:
          "Er ging iets mis bij het ophalen van het antwoord. Probeer het later opnieuw.",
        steps: [],
        summary: "",
        follow_ups: [],
        source_ids: [],
        has_sources: false,
      };
    }
  });
