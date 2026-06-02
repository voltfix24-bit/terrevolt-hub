import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1).max(2000),
  context: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        section: z.string().optional(),
        client: z.string().optional(),
        document_type: z.string().optional(),
        summary: z.string().optional(),
        content: z.string().optional(),
      }),
    )
    .max(20),
});

export const askKnowledgeBase = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        answer:
          "De AI-assistent is nog niet geconfigureerd. Stel LOVABLE_API_KEY in om vragen te beantwoorden.",
        sources: [] as string[],
      };
    }

    const docs = data.context
      .map((d, i) => {
        const meta = [d.section, d.client, d.document_type].filter(Boolean).join(" · ");
        const body = (d.summary || d.content || "").slice(0, 1500);
        return `### [${i + 1}] ${d.title}\nMeta: ${meta}\n${body}`;
      })
      .join("\n\n");

    const system = `Je bent de TerreVolt kennisbank-assistent. Beantwoord vragen kort, duidelijk en in het Nederlands.
- Baseer je antwoord uitsluitend op de onderstaande documenten.
- Verwijs naar bronnen met [nummer].
- Als het antwoord niet in de documenten staat, zeg dat eerlijk en suggereer wie te benaderen.`;

    const prompt = `${system}\n\nDocumenten:\n${docs}\n\nVraag: ${data.question}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 429) {
          return {
            answer:
              "Te veel verzoeken op dit moment. Probeer het zo dadelijk opnieuw.",
            sources: [],
          };
        }
        if (res.status === 402) {
          return {
            answer:
              "Het AI-tegoed is op. Voeg credits toe in workspace-instellingen om door te gaan.",
            sources: [],
          };
        }
        throw new Error(`AI gateway ${res.status}: ${text}`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const answer = json.choices?.[0]?.message?.content ?? "Geen antwoord beschikbaar.";
      return { answer, sources: data.context.map((d) => d.id) };
    } catch (err) {
      console.error("kb-ai error", err);
      return {
        answer: "Er ging iets mis bij het ophalen van het antwoord. Probeer het later opnieuw.",
        sources: [],
      };
    }
  });
