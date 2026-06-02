import { useMemo, useState } from "react";
import { Sparkles, Send, Loader2, BookOpen } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { askKnowledgeBase } from "@/lib/kb-ai.functions";
import type { KbArticle, KbSection } from "@/lib/knowledge";

export function AskAssistant({
  articles,
  sections,
}: {
  articles: KbArticle[];
  sections: KbSection[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const ask = useServerFn(askKnowledgeBase);

  const sectionById = useMemo(() => {
    const m = new Map<string, KbSection>();
    for (const s of sections) m.set(s.id, s);
    return m;
  }, [sections]);

  const sources = useMemo(
    () => articles.filter((a) => sourceIds.includes(a.id)),
    [articles, sourceIds],
  );

  const submit = async () => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    setSourceIds([]);
    try {
      // naive ranking: score by keyword overlap with title/summary/tags/content
      const terms = q
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2);
      const scored = articles
        .filter((a) => a.status !== "archived")
        .map((a) => {
          const hay = [
            a.title,
            a.summary,
            a.client,
            a.owner,
            (a.tags ?? []).join(" "),
            a.content.slice(0, 4000),
          ]
            .join(" ")
            .toLowerCase();
          let score = 0;
          for (const t of terms) if (hay.includes(t)) score += t.length;
          // boost active, expiring penalty
          if (a.status === "active") score += 1;
          return { a, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((s) => s.a);

      const ctx = (scored.length > 0 ? scored : articles.slice(0, 8)).map((a) => ({
        id: a.id,
        title: a.title,
        section: sectionById.get(a.section_id ?? "")?.name,
        client: a.client || undefined,
        document_type: a.document_type,
        summary: a.summary || undefined,
        content: a.content.slice(0, 2000) || undefined,
      }));

      const res = await ask({ data: { question: q, context: ctx } });
      setAnswer(res.answer);
      setSourceIds(res.sources);
    } catch (err) {
      console.error(err);
      setAnswer("Er ging iets mis. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-pastel/40 via-card to-lime-soft/30 shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-navy">Vraag de kennisbank</div>
            <div className="text-xs text-foreground/70">
              Stel een vraag in gewoon Nederlands. De assistent zoekt door alle actieve documenten.
            </div>
          </div>
        </div>
        <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-brand">
          {open ? "Verbergen" : "Openen"}
        </span>
      </button>

      {open && (
        <div className="border-t border-brand/20 bg-card/60 p-5">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Bijv. Wat zijn de BEI-eisen voor LS metingen bij Liander?"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button
              onClick={submit}
              disabled={loading || !q.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Vraag
            </button>
          </div>

          {answer && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-7 text-foreground/90 whitespace-pre-wrap">
                {answer}
              </div>
              {sources.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bronnen
                  </div>
                  <ul className="space-y-1.5">
                    {sources.map((s) => {
                      const sec = sectionById.get(s.section_id ?? "");
                      return (
                        <li key={s.id}>
                          <Link
                            to="/kennisbank/$slug/$articleSlug"
                            params={{
                              slug: sec?.slug ?? "item",
                              articleSlug: s.slug,
                            }}
                            className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-sm transition hover:border-brand/40 hover:bg-accent/40"
                          >
                            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            <div className="min-w-0">
                              <div className="font-medium text-navy">{s.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {sec?.name}
                                {s.client ? ` · ${s.client}` : ""} · v{s.version}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
