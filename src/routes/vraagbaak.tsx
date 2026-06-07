import React, { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  Send,
  Loader2,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  ArrowUpRight,
  History,
  BookOpen,
  Newspaper,
  Wallet,
  User,
  AppWindow,
  Cloud,
  ExternalLink,
  Link as LinkIcon,
  Users,
} from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import {
  askVraagbaak,
  type VraagbaakAnswer,
  type ResolvedSource,
  type KbChunkSource,
} from "@/lib/vraagbaak.functions";
import {
  FEEDBACK_LABELS,
  useFeedbackMutation,
  useSaveBookmark,
  useVraagbaakRecent,
  type VraagbaakFeedbackType,
} from "@/lib/vraagbaak";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth";


export const Route = createFileRoute("/vraagbaak")({
  head: () => ({
    meta: [
      { title: "Vraagbaak - TerreVolt Hub" },
      {
        name: "description",
        content:
          "Doorzoek interne kennis, procedures en documenten in de TerreVolt Hub.",
      },
    ],
  }),
  component: VraagbaakPage,
});

const EXAMPLE_QUESTIONS = [
  "Wie heeft BEI-3?",
  "Hoe factureer ik Van Gelder?",
  "Waar boek ik mijn uren?",
  "Wat is het laatste nieuws over BEI?",
  "Welke bijlagen moet ik meesturen bij Hanab?",
  "Waar vind ik de aardingsprocedures?",
];

const SOURCE_LABEL: Record<KbChunkSource, string> = {
  kb_article: "Kennisbank",
  news: "Nieuws",
  finance_client: "Finance",
  person: "Smoelenboek",
  application: "Applicatie",
  sharepoint_item: "SharePoint",
  partner_link: "Partner",
  quick_link: "Snelkoppeling",
  department: "Afdeling",
};

function SourceIcon({ type, className = "h-4 w-4" }: { type: KbChunkSource; className?: string }) {
  switch (type) {
    case "kb_article": return <BookOpen className={className} />;
    case "news": return <Newspaper className={className} />;
    case "finance_client": return <Wallet className={className} />;
    case "person": return <User className={className} />;
    case "application": return <AppWindow className={className} />;
    case "sharepoint_item": return <Cloud className={className} />;
    case "partner_link": return <ExternalLink className={className} />;
    case "quick_link": return <LinkIcon className={className} />;
    case "department": return <Users className={className} />;
  }
}

type DatePreset = "any" | "7d" | "30d" | "365d";

function presetToFrom(p: DatePreset): string | undefined {
  if (p === "any") return undefined;
  const days = p === "7d" ? 7 : p === "30d" ? 30 : 365;
  return new Date(Date.now() - days * 86400_000).toISOString();
}

function VraagbaakPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<VraagbaakAnswer | null>(null);
  const [answerForQuestion, setAnswerForQuestion] = useState("");
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<VraagbaakFeedbackType | null>(null);
  const [sourceFilter, setSourceFilter] = useState<KbChunkSource[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("any");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ask = useServerFn(askVraagbaak);
  const { session } = useSession();
  const [needsLogin, setNeedsLogin] = useState(false);
  const { data: recent = [] } = useVraagbaakRecent(6);
  const bookmark = useSaveBookmark();
  const feedback = useFeedbackMutation();
  const qc = useQueryClient();

  const toggleSource = (t: KbChunkSource) => {
    setSourceFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const submit = async (override?: string, opts?: { forceFresh?: boolean }) => {
    const q = (override ?? question).trim();
    if (!q || loading) return;
    if (!session) {
      setQuestion(q);
      setAnswer(null);
      setNeedsLogin(true);
      return;
    }
    setNeedsLogin(false);

    setQuestion(q);
    setLoading(true);
    setAnswer(null);
    setSavedQuestionId(null);
    setBookmarked(false);
    setFeedbackSent(null);

    try {
      const res = await ask({
        data: {
          question: q,
          force_fresh: !!opts?.forceFresh,
          source_types: sourceFilter.length ? sourceFilter : undefined,
          date_from: presetToFrom(datePreset),
        },
      });
      setAnswer(res);
      setAnswerForQuestion(q);
      if (res.question_id) setSavedQuestionId(res.question_id);
      if (!res.cached) qc.invalidateQueries({ queryKey: ["vraagbaak_questions"] });
    } catch (err) {
      console.error(err);
      setAnswer({
        short_answer:
          "Er ging iets mis bij het ophalen van het antwoord. Probeer het later opnieuw.",
        steps: [],
        summary: "",
        follow_ups: [],
        sources: [],
        suggestions: [],
        has_sources: false,
        cached: false,
      });
    } finally {
      setLoading(false);
    }
  };


  const onExample = (q: string) => {
    setQuestion(q);

    void submit(q);
    inputRef.current?.focus();
  };

  const onFeedback = async (t: VraagbaakFeedbackType) => {
    if (!savedQuestionId || feedbackSent) return;
    setFeedbackSent(t);
    try {
      await feedback.mutateAsync({ question_id: savedQuestionId, feedback_type: t });
    } catch (e) {
      console.error(e);
      setFeedbackSent(null);
    }
  };

  const onBookmark = async () => {
    if (!savedQuestionId || bookmarked) return;
    setBookmarked(true);
    try {
      await bookmark.mutateAsync({
        question_id: savedQuestionId,
        label: answerForQuestion.slice(0, 80),
      });
    } catch (e) {
      console.error(e);
      setBookmarked(false);
    }
  };

  return (
    <HubLayout>
      <SectionHeader
        title="Vraagbaak"
        subtitle="Zoek in interne kennis, procedures en documenten."
      />

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-pastel/50 via-card to-lime-soft/40 p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-navy">Interne zoekvraagbaak</div>
            <div className="text-xs text-foreground/70">
              Geen AI - alleen interne bronnen uit kennisbank, nieuws, mensen, applicaties en meer.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={2}
            placeholder="Bijv. BEI-3, factureren Van Gelder, aardingsprocedure..."
            className="block w-full resize-none rounded-2xl bg-transparent px-5 py-4 text-base outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5">
            <div className="px-2 text-xs text-muted-foreground">
              Enter om te zoeken - Shift+Enter voor nieuwe regel
            </div>
            <button
              onClick={() => void submit()}
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Zoeken
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bron:
          </span>
          {(Object.keys(SOURCE_LABEL) as KbChunkSource[]).map((t) => {
            const active = sourceFilter.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleSource(t)}
                className={[
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  active
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-card text-foreground/70 hover:border-brand/40 hover:text-navy",
                ].join(" ")}
              >
                <SourceIcon type={t} className="h-3 w-3" />
                {SOURCE_LABEL[t]}
              </button>
            );
          })}
          <span className="ml-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Datum:
          </span>
          {(["any", "7d", "30d", "365d"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setDatePreset(p)}
              className={[
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                datePreset === p
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-card text-foreground/70 hover:border-brand/40 hover:text-navy",
              ].join(" ")}
            >
              {p === "any" ? "alles" : p === "7d" ? "laatste 7d" : p === "30d" ? "laatste 30d" : "laatste jaar"}
            </button>
          ))}
          {(sourceFilter.length > 0 || datePreset !== "any") && (
            <button
              onClick={() => {
                setSourceFilter([]);
                setDatePreset("any");
              }}
              className="ml-1 text-[11px] font-medium text-muted-foreground underline hover:text-brand"
            >
              wissen
            </button>
          )}
        </div>


        {!answer && !loading && (
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Voorbeeldvragen
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => onExample(ex)}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-brand/40 hover:bg-pastel/40 hover:text-navy"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {needsLogin && !session && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-pastel/60 p-2 text-brand">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-navy">Log in om door te gaan</div>
              <div className="mt-1 text-sm text-muted-foreground">
                De Vraagbaak doorzoekt interne kennis. Meld je aan om te zoeken.
              </div>
            </div>
          </div>
          <Link
            to="/auth"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition hover:opacity-90"
          >
            Inloggen
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {loading && (

        <div className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
        </div>
      )}

      {answer && !loading && (
        <div className="mt-6 space-y-4">
          {answer.cached && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft/60 px-3 py-1 text-[11px] font-medium text-navy">
              <Sparkles className="h-3 w-3" />
              Beantwoord uit cache - {answer.cache_age_days ?? 0}{" "}
              {answer.cache_age_days === 1 ? "dag" : "dagen"} oud
              <button
                onClick={() => void submit(answerForQuestion, { forceFresh: true })}
                className="ml-1 underline hover:text-brand"
              >
                opnieuw beantwoorden
              </button>
            </div>
          )}
          <AnswerCard
            answer={answer}
            question={answerForQuestion}
            bookmarked={bookmarked}
            feedbackSent={feedbackSent}
            onBookmark={onBookmark}
            onFeedback={onFeedback}
            onFollowUp={(q) => {
              setQuestion(q);
              void submit(q);
            }}
            canPersist={!!savedQuestionId}
          />
        </div>
      )}


      {recent.length > 0 && (
        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
            <History className="h-4 w-4 text-brand" />
            Recente vragen
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {recent.map((r) => (
              <button
                key={r.id}
                onClick={() => onExample(r.question)}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-brand/40 hover:bg-pastel/30"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-navy">{r.question}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {r.short_answer}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-brand" />
              </button>
            ))}
          </div>
        </div>
      )}
    </HubLayout>
  );
}

/* --------------------------- Answer card --------------------------- */

function AnswerCard({
  answer,
  question,
  bookmarked,
  feedbackSent,
  onBookmark,
  onFeedback,
  onFollowUp,
  canPersist,
}: {
  answer: VraagbaakAnswer;
  question: string;
  bookmarked: boolean;
  feedbackSent: VraagbaakFeedbackType | null;
  onBookmark: () => void;
  onFeedback: (t: VraagbaakFeedbackType) => void;
  onFollowUp: (q: string) => void;
  canPersist: boolean;
}) {
  const noSource = !answer.has_sources;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jouw vraag
          </div>
          <div className="mt-1 text-base font-medium text-navy">{question}</div>
        </div>
        <button
          onClick={onBookmark}
          disabled={!canPersist || bookmarked}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-brand/40 hover:text-navy disabled:opacity-50"
        >
          {bookmarked ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />}
          {bookmarked ? "Opgeslagen" : "Bewaar"}
        </button>
      </div>

      <div className="space-y-5 px-6 py-5">
        {noSource ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{answer.short_answer}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-sm">
              <div className="mb-2 font-semibold text-navy">Wat kun je nu proberen?</div>
              <ul className="list-disc space-y-1 pl-5 text-foreground/80">
                <li>Probeer andere of bredere zoekwoorden (synoniemen, afkortingen).</li>
                <li>
                  Verwijder filters of zoek direct in de{" "}
                  <Link to="/kennisbank" className="text-brand underline">
                    kennisbank
                  </Link>
                  .
                </li>
                <li>
                  Ontbreekt dit echt?{" "}
                  <a href="mailto:beheer@terrevolt.nl?subject=Vraagbaak%20-%20ontbrekende%20kennis" className="text-brand underline">
                    Dien een vraag in bij de beheerder
                  </a>
                  .
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {answer.direct_answer ? (
              <div className="rounded-2xl border border-brand/30 bg-pastel/40 p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">
                  Beste match
                </div>
                <div className="mb-2 text-sm font-semibold text-navy">
                  {highlightSnippet(answer.direct_answer.title, question)}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {highlightSnippet(answer.direct_answer.content, question)}
                </p>
                {answer.direct_answer.url && (
                  answer.direct_answer.external ? (
                    <a
                      href={answer.direct_answer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                    >
                      Bron openen <ArrowUpRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      to={answer.direct_answer.url}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                    >
                      Bron openen <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )
                )}
              </div>
            ) : (
              <p className="text-base leading-relaxed text-navy">{answer.short_answer}</p>
            )}

            {answer.suggestions.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {answer.direct_answer ? "Verwante vragen" : "Bedoel je"}
                </div>
                <div className="flex flex-col gap-1.5">
                  {answer.suggestions
                    .filter((s) => !answer.direct_answer || s.title !== answer.direct_answer.title)
                    .map((s) => (
                      <button
                        key={`${s.source_id}:${s.title}`}
                        onClick={() => onFollowUp(s.title)}
                        className="group flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm text-navy shadow-sm transition hover:border-brand/40 hover:bg-pastel/30"
                      >
                        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span className="flex-1">
                          <span className="block">{highlightSnippet(s.title, question)}</span>
                          {s.snippet && (
                            <span className="mt-0.5 block line-clamp-2 text-xs font-normal text-muted-foreground">
                              {highlightSnippet(s.snippet, question)}
                            </span>
                          )}
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-brand" />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sources */}
        {answer.sources.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gevonden bronnen
            </div>
            <ol className="grid gap-2">
              {answer.sources.map((s, i) => (
                <li key={`${s.source_type}:${s.source_id}:${i}`}>
                  <SourceRow source={s} index={i + 1} query={question} />
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Follow-ups */}
        {answer.follow_ups.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vervolgvragen
            </div>
            <div className="flex flex-wrap gap-2">
              {answer.follow_ups.map((q) => (
                <button
                  key={q}
                  onClick={() => onFollowUp(q)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-brand/40 hover:bg-pastel/40 hover:text-navy"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-brand" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {canPersist && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <span className="mr-1 text-xs text-muted-foreground">Klopt dit antwoord?</span>
            {(Object.keys(FEEDBACK_LABELS) as VraagbaakFeedbackType[]).map((t) => (
              <button
                key={t}
                onClick={() => onFeedback(t)}
                disabled={!!feedbackSent}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                  feedbackSent === t
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-border bg-card text-foreground/80 hover:border-brand/40 hover:text-navy",
                  feedbackSent && feedbackSent !== t ? "opacity-50" : "",
                ].join(" ")}
              >
                {feedbackSent === t && <CheckCircle2 className="h-3.5 w-3.5" />}
                {FEEDBACK_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MATCH_LABEL: Record<string, string> = {
  title_exact: "Exacte titel",
  title_contains: "Titel",
  title_all_tokens: "Titel (alle woorden)",
  title_token: "Titel (woord)",
  tag_or_category: "Tag/categorie",
  fts_content: "Tekst",
  content_phrase: "Tekst (zin)",
  content_token: "Tekst (woord)",
};

// Synonym groups — mirror the server-side expansion in search_kb_chunks
// so highlighted terms match what the search actually found.
const SYNONYM_GROUPS: string[][] = [
  ["msr", "middenspanningsruimte", "station"],
  ["imsr", "intelligente"],
  ["rmu", "ring", "main", "unit"],
  ["svk", "storingsverklikker"],
  ["da", "distributieautomatisering"],
  ["lsrek", "laagspanningsrek", "ls", "rek"],
  ["safeplus", "abb"],
  ["bluegis", "siemens"],
  ["magnefix", "eaton"],
  ["iec", "nen", "norm"],
  ["trafo", "distributietransformator"],
  ["cilinder", "sleutel", "sleutelkluis"],
  ["rookmelder", "brandmelder"],
  ["kabelkelder", "waterdicht"],
  ["vluchtweg", "vluchtroute"],
  ["aarding", "aardelektrode"],
];

function expandTerms(query: string): string[] {
  const raw = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);
  const set = new Set<string>(raw);
  for (const tk of raw) {
    for (const group of SYNONYM_GROUPS) {
      if (group.includes(tk)) group.forEach((g) => set.add(g));
    }
  }
  return Array.from(set).filter((t) => t.length >= 2);
}

function buildClientSnippet(text: string, terms: string[], len = 220): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) return clean.slice(0, len) + (clean.length > len ? "…" : "");
  const start = Math.max(0, idx - 70);
  const end = Math.min(clean.length, start + len);
  return (
    (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "")
  );
}

function highlightSnippet(text: string, query: string): React.ReactNode {
  if (!text) return null;
  const terms = expandTerms(query);
  if (terms.length === 0) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "giu");
  const parts = text.split(re);
  return parts.map((p, i) =>
    terms.includes(p.toLowerCase()) ? (
      <mark key={i} className="rounded bg-yellow-200/70 px-0.5 text-navy">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function SourceRow({
  source,
  index,
  query,
}: {
  source: ResolvedSource;
  index: number;
  query: string;
}) {
  const inner = (
    <>
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
        {index}
      </span>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-navy">
        <SourceIcon type={source.source_type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-navy">{source.title}</div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{SOURCE_LABEL[source.source_type]}</span>
          {source.match_kind && (
            <span className="rounded-full bg-pastel/60 px-1.5 py-0.5 text-[10px] font-medium text-navy">
              {MATCH_LABEL[source.match_kind] ?? source.match_kind}
            </span>
          )}
          {source.similarity ? <span>· score {source.similarity.toFixed(2)}</span> : null}
        </div>
        {source.snippet && (
          <div className="mt-1 line-clamp-2 text-xs text-foreground/70">
            {highlightSnippet(source.snippet, query)}
          </div>
        )}
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );


  const className =
    "group flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm transition hover:border-brand/40 hover:bg-pastel/30";

  if (source.external && source.url) {
    return (
      <a href={source.url} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  if (!source.url) {
    return <div className={className}>{inner}</div>;
  }
  return (
    <Link to={source.url} className={className}>
      {inner}
    </Link>
  );
}
