import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  Send,
  Loader2,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  History,
  Wallet,
  FileText,
  ExternalLink,
} from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import { SectionHeader } from "@/components/hub/SectionHeader";
import {
  useKbArticles,
  useKbSections,
  formatKbDate,
  type KbArticle,
  type KbSection,
} from "@/lib/knowledge";
import {
  useFinanceClients,
  FINANCE_FIELDS,
  type FinanceClient,
} from "@/lib/finance";
import { askVraagbaak, type VraagbaakAnswer } from "@/lib/vraagbaak.functions";
import {
  FEEDBACK_LABELS,
  useFeedbackMutation,
  useSaveAnswer,
  useSaveBookmark,
  useVraagbaakRecent,
  type VraagbaakFeedbackType,
} from "@/lib/vraagbaak";

const FIN_PREFIX = "fin:";

function buildFinanceContent(c: FinanceClient): string {
  const parts: string[] = [];
  for (const { key, label } of FINANCE_FIELDS) {
    const v = c[key];
    if (v && v.trim()) parts.push(`${label}: ${v.trim()}`);
  }
  return parts.join("\n");
}

export const Route = createFileRoute("/vraagbaak")({
  head: () => ({
    meta: [
      { title: "Vraagbaak — TerreVolt Hub" },
      {
        name: "description",
        content:
          "Stel een vraag over procedures, documenten, opdrachtgevers en veiligheid. De Vraagbaak antwoordt op basis van de TerreVolt kennisbank.",
      },
    ],
  }),
  component: VraagbaakPage,
});

const EXAMPLE_QUESTIONS = [
  "Hoe factureer ik Van Gelder?",
  "Welke bijlagen moet ik meesturen bij Hanab?",
  "Wat zijn de Liander eisen voor montage?",
  "Welke documenten heb ik nodig voor aarding?",
  "Waar vind ik de BEI instructies?",
  "Hoe boek ik uren?",
  "Wat moet ik doen bij verlopen certificaten?",
];

const NO_SOURCE_TEXT =
  "Ik kan dit niet met zekerheid vinden in de kennisbank. Controleer de originele documenten of vraag dit na bij de verantwoordelijke.";

type ResolvedSource = {
  article: KbArticle;
  section: KbSection | undefined;
};

function VraagbaakPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<VraagbaakAnswer | null>(null);
  const [answerForQuestion, setAnswerForQuestion] = useState("");
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<VraagbaakFeedbackType | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ask = useServerFn(askVraagbaak);

  const { data: sections = [] } = useKbSections();
  const { data: articles = [] } = useKbArticles();
  const { data: financeClients = [] } = useFinanceClients();
  const { data: recent = [] } = useVraagbaakRecent(6);

  const saveAnswer = useSaveAnswer();
  const bookmark = useSaveBookmark();
  const feedback = useFeedbackMutation();

  const sectionById = useMemo(() => {
    const m = new Map<string, KbSection>();
    for (const s of sections) m.set(s.id, s);
    return m;
  }, [sections]);

  const articleById = useMemo(() => {
    const m = new Map<string, KbArticle>();
    for (const a of articles) m.set(a.id, a);
    return m;
  }, [articles]);

  const financeById = useMemo(() => {
    const m = new Map<string, FinanceClient>();
    for (const c of financeClients) m.set(c.id, c);
    return m;
  }, [financeClients]);

  const financeSources: FinanceClient[] = useMemo(() => {
    if (!answer) return [];
    return answer.source_ids
      .filter((id) => id.startsWith(FIN_PREFIX))
      .map((id) => financeById.get(id.slice(FIN_PREFIX.length)))
      .filter((c): c is FinanceClient => !!c);
  }, [answer, financeById]);

  const sources: ResolvedSource[] = useMemo(() => {
    if (!answer) return [];
    return answer.source_ids
      .filter((id) => !id.startsWith(FIN_PREFIX))
      .map((id) => articleById.get(id))
      .filter((a): a is KbArticle => !!a)
      .map((a) => ({ article: a, section: sectionById.get(a.section_id ?? "") }));
  }, [answer, articleById, sectionById]);

  const related: KbArticle[] = useMemo(() => {
    if (!answer || (sources.length === 0 && financeSources.length === 0)) return [];
    const sourceIds = new Set(answer.source_ids);
    const relatedSet = new Map<string, KbArticle>();
    const addRelated = (ids: string[] | undefined) => {
      for (const rid of ids ?? []) {
        if (!sourceIds.has(rid) && !relatedSet.has(rid)) {
          const a = articleById.get(rid);
          if (a) relatedSet.set(rid, a);
        }
      }
    };
    for (const s of sources) addRelated(s.article.related_ids);
    for (const c of financeSources) addRelated(c.related_ids);
    return Array.from(relatedSet.values()).slice(0, 4);
  }, [answer, sources, financeSources, articleById]);

  const submit = async (override?: string) => {
    const q = (override ?? question).trim();
    if (!q || loading) return;
    setQuestion(q);
    setLoading(true);
    setAnswer(null);
    setSavedQuestionId(null);
    setBookmarked(false);
    setFeedbackSent(null);

    try {
      // Naive ranking by keyword overlap with title/summary/tags/content
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
          if (a.status === "active") score += 1;
          return { a, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((s) => s.a);

      // Score finance clients (boost matches on factuur/factureer/factuur terms)
      const financeTerms = ["factur", "factuur", "betal", "bijlag", "btw", "g-rekening", "po-nummer", "referent"];
      const isFinanceQuery = financeTerms.some((t) => q.toLowerCase().includes(t));
      const scoredFinance = financeClients
        .filter((c) => !c.archived)
        .map((c) => {
          const hay = [c.name, c.short_description, buildFinanceContent(c)]
            .join(" ")
            .toLowerCase();
          let score = 0;
          for (const t of terms) if (hay.includes(t)) score += t.length;
          if (isFinanceQuery) score += 2;
          return { c, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((s) => s.c);

      const ctx = [
        ...scored.map((a) => ({
          id: a.id,
          title: a.title,
          section: sectionById.get(a.section_id ?? "")?.name,
          client: a.client || undefined,
          document_type: a.document_type,
          summary: a.summary || undefined,
          content: a.content.slice(0, 2000) || undefined,
          valid_until: a.valid_until,
          updated_at: a.updated_at,
        })),
        ...scoredFinance.map((c) => ({
          id: `${FIN_PREFIX}${c.id}`,
          title: `Hoe factureer ik ${c.name}?`,
          section: "Finance Wiki",
          client: c.name,
          document_type: "finance-wiki",
          summary: c.short_description || undefined,
          content: buildFinanceContent(c) || undefined,
          valid_until: null,
          updated_at: c.updated_at,
        })),
      ];

      const res = await ask({ data: { question: q, context: ctx } });
      setAnswer(res);
      setAnswerForQuestion(q);

      // Persist the Q&A — articles only, finance sources separately
      const resolvedArticles = res.source_ids
        .filter((id) => !id.startsWith(FIN_PREFIX))
        .map((id) => articleById.get(id))
        .filter((a): a is KbArticle => !!a);
      const resolvedFinance = res.source_ids
        .filter((id) => id.startsWith(FIN_PREFIX))
        .map((id) => financeById.get(id.slice(FIN_PREFIX.length)))
        .filter((c): c is FinanceClient => !!c);

      const persistedId = await saveAnswer.mutateAsync({
        question: q,
        short_answer: res.short_answer,
        steps: res.steps,
        summary: res.summary,
        follow_ups: res.follow_ups,
        related_ids: [
          ...resolvedArticles.flatMap((a) => a.related_ids ?? []),
          ...resolvedFinance.flatMap((c) => c.related_ids ?? []),
        ].slice(0, 8),
        has_sources: res.has_sources,
        sources: [
          ...resolvedArticles.map((a) => ({
            article_id: a.id,
            title: a.title,
            section_heading: sectionById.get(a.section_id ?? "")?.name ?? "",
            page_number: null,
            file_url: a.file_url || "",
            external_url: a.external_url || "",
            last_updated: a.updated_at ? a.updated_at.slice(0, 10) : null,
          })),
          ...resolvedFinance.map((c) => ({
            article_id: null,
            title: `Hoe factureer ik ${c.name}?`,
            section_heading: "Finance Wiki",
            page_number: null,
            file_url: "",
            external_url: `/finance-wiki/${c.slug}`,
            last_updated: c.updated_at ? c.updated_at.slice(0, 10) : null,
          })),
        ],
      });
      setSavedQuestionId(persistedId);
    } catch (err) {
      console.error(err);
      setAnswer({
        short_answer:
          "Er ging iets mis bij het ophalen van het antwoord. Probeer het later opnieuw.",
        steps: [],
        summary: "",
        follow_ups: [],
        source_ids: [],
        has_sources: false,
      });
      setAnswerForQuestion(q);
    } finally {
      setLoading(false);
    }
  };

  const onExample = (ex: string) => {
    setQuestion(ex);
    void submit(ex);
    inputRef.current?.focus();
  };

  const onFeedback = async (type: VraagbaakFeedbackType) => {
    if (!savedQuestionId || feedbackSent) return;
    setFeedbackSent(type);
    try {
      await feedback.mutateAsync({ question_id: savedQuestionId, feedback_type: type });
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
        title="Stel je vraag — de kennisbank antwoordt"
        subtitle="Vraag iets over procedures, opdrachtgevers, veiligheid of finance. De Vraagbaak antwoordt op basis van bronnen uit de TerreVolt kennisbank."
      />

      {/* Question input */}
      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-pastel/50 via-card to-lime-soft/40 p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-navy">Vraagbaak assistent</div>
            <div className="text-xs text-foreground/70">
              Antwoorden zijn altijd voorzien van bronnen uit de kennisbank.
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
            placeholder="Bijv. Welke bijlagen moet ik meesturen bij Hanab?"
            className="block w-full resize-none rounded-2xl bg-transparent px-5 py-4 text-base outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5">
            <div className="px-2 text-xs text-muted-foreground">
              Enter om te vragen · Shift+Enter voor nieuwe regel
            </div>
            <button
              onClick={() => void submit()}
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Vraag
            </button>
          </div>
        </div>

        {/* Examples */}
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

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
        </div>
      )}

      {/* Answer */}
      {answer && !loading && (
        <div className="mt-6 space-y-6">
          <AnswerCard
            answer={answer}
            question={answerForQuestion}
            sources={sources}
            financeSources={financeSources}
            related={related}
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

      {/* Recent */}
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
                  <div className="truncate text-sm font-medium text-navy">
                    {r.question}
                  </div>
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

/* -------------------------- Answer card -------------------------- */

function AnswerCard({
  answer,
  question,
  sources,
  financeSources,
  related,
  bookmarked,
  feedbackSent,
  onBookmark,
  onFeedback,
  onFollowUp,
  canPersist,
}: {
  answer: VraagbaakAnswer;
  question: string;
  sources: ResolvedSource[];
  financeSources: FinanceClient[];
  related: KbArticle[];
  bookmarked: boolean;
  feedbackSent: VraagbaakFeedbackType | null;
  onBookmark: () => void;
  onFeedback: (t: VraagbaakFeedbackType) => void;
  onFollowUp: (q: string) => void;
  canPersist: boolean;
}) {
  const noSource = !answer.has_sources;
  const totalSources = sources.length + financeSources.length;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* Header */}
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-brand/40 hover:text-navy disabled:opacity-60"
        >
          {bookmarked ? (
            <>
              <BookmarkCheck className="h-4 w-4 text-brand" /> Opgeslagen
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" /> Opslaan
            </>
          )}
        </button>
      </div>

      {/* 1. Kort antwoord */}
      <Section title="Kort antwoord">
        {noSource ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{NO_SOURCE_TEXT}</div>
          </div>
        ) : (
          <p className="text-[15px] leading-7 text-foreground/90">{answer.short_answer}</p>
        )}
        {answer.summary && !noSource && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer.summary}</p>
        )}
      </Section>

      {/* 2. Stappenplan */}
      {answer.steps.length > 0 && (
        <Section title="Stappenplan">
          <ol className="space-y-2">
            {answer.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-6 text-foreground/90">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 3. Bronnen */}
      <Section title="Bronnen">
        {totalSources === 0 ? (
          <div className="text-sm text-muted-foreground">
            Geen bronnen gevonden in de kennisbank.
          </div>
        ) : (
          <ul className="space-y-2">
            {financeSources.map((c) => (
              <li key={`fin-${c.id}`}>
                <Link
                  to="/finance-wiki/$slug"
                  params={{ slug: c.slug }}
                  className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-pastel/30 p-3.5 shadow-sm transition hover:border-brand/60 hover:bg-pastel/50"
                >
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-navy">
                      Hoe factureer ik {c.name}?
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Finance Wiki · {c.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Bijgewerkt {formatKbDate(c.updated_at)}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
            {sources.map((s) => {
              const a = s.article;
              const dateLabel = a.document_date ?? a.updated_at;
              const hasPdf = !!a.file_url;
              return (
                <li
                  key={a.id}
                  className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:border-brand/40"
                >
                  <Link
                    to="/kennisbank/$slug/$articleSlug"
                    params={{
                      slug: s.section?.slug ?? "item",
                      articleSlug: a.slug,
                    }}
                    className="flex items-start gap-3 p-3.5 transition hover:bg-pastel/30"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                        Bron
                      </div>
                      <div className="truncate text-sm font-medium text-navy">
                        {a.title}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[s.section?.name, a.client, `v${a.version}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {a.document_date ? "Documentdatum" : "Bijgewerkt"}{" "}
                        {formatKbDate(dateLabel)}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                  {hasPdf && (
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 border-t border-border/60 bg-pastel/20 px-3.5 py-2 text-xs font-medium text-navy transition hover:bg-pastel/40"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-brand" />
                        PDF openen{a.file_name ? ` · ${a.file_name}` : ""}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* 4. Gerelateerde documenten */}
      {related.length > 0 && (
        <Section title="Gerelateerde documenten">
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((a) => {
              const sec = a.section_id;
              const section = sources.find((s) => s.section?.id === sec)?.section;
              return (
                <Link
                  key={a.id}
                  to="/kennisbank/$slug/$articleSlug"
                  params={{
                    slug: section?.slug ?? "item",
                    articleSlug: a.slug,
                  }}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-background p-3 text-sm shadow-sm transition hover:border-brand/40 hover:bg-pastel/30"
                >
                  <span className="truncate text-foreground/90">{a.title}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Follow-ups */}
      {answer.follow_ups.length > 0 && (
        <Section title="Vervolgvragen">
          <div className="flex flex-wrap gap-2">
            {answer.follow_ups.map((f) => (
              <button
                key={f}
                onClick={() => onFollowUp(f)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-brand/40 hover:bg-pastel/40 hover:text-navy"
              >
                <HelpCircle className="h-3.5 w-3.5 text-brand" />
                {f}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Feedback */}
      <div className="border-t border-border/60 bg-muted/30 px-6 py-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Feedback
        </div>
        {feedbackSent ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand">
            <CheckCircle2 className="h-4 w-4" />
            Bedankt — “{FEEDBACK_LABELS[feedbackSent]}” geregistreerd.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FEEDBACK_LABELS) as VraagbaakFeedbackType[]).map((t) => (
              <button
                key={t}
                onClick={() => onFeedback(t)}
                disabled={!canPersist}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-brand/40 hover:text-navy disabled:opacity-50"
              >
                {FEEDBACK_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

/** Renders text with inline [k] citation badges that scroll to the matching source. */
function CitedText({ text, max }: { text: string; max: number }) {
  if (!text) return null;
  const parts: Array<string | number> = [];
  const re = /\[(\d+)\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= max) parts.push(n);
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  const jump = (n: number) => {
    const el = document.getElementById(`vb-source-${n}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-brand", "ring-offset-2");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-brand", "ring-offset-2");
    }, 1600);
  };

  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => jump(p)}
            title={`Spring naar bron ${p}`}
            className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-brand/40 bg-brand/10 px-1 align-baseline text-[10px] font-semibold text-brand transition hover:bg-brand/20"
          >
            {p}
          </button>
        )
      )}
    </>
  );
}
