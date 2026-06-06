import { useRef, useState } from "react";
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
  useSaveAnswer,
  useSaveBookmark,
  useVraagbaakRecent,
  type VraagbaakFeedbackType,
} from "@/lib/vraagbaak";

export const Route = createFileRoute("/vraagbaak")({
  head: () => ({
    meta: [
      { title: "Vraagbaak — TerreVolt Hub" },
      {
        name: "description",
        content:
          "Stel een vraag over procedures, documenten, opdrachtgevers, nieuws, mensen en applicaties. De Vraagbaak doorzoekt de hele TerreVolt Hub.",
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
  const { data: recent = [] } = useVraagbaakRecent(6);
  const saveAnswer = useSaveAnswer();
  const bookmark = useSaveBookmark();
  const feedback = useFeedbackMutation();

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
      const res = await ask({ data: { question: q } });
      setAnswer(res);
      setAnswerForQuestion(q);

      const persistedId = await saveAnswer.mutateAsync({
        question: q,
        short_answer: res.short_answer,
        steps: res.steps,
        summary: res.summary,
        follow_ups: res.follow_ups,
        related_ids: [],
        has_sources: res.has_sources,
        sources: res.sources.map((s) => ({
          article_id: s.source_type === "kb_article" ? s.source_id : null,
          source_type: s.source_type,
          title: s.title,
          section_heading: SOURCE_LABEL[s.source_type],
          page_number: null,
          file_url: "",
          external_url: s.url,
          last_updated: null,
        })),
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
        sources: [],
        has_sources: false,
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
        title="Stel je vraag — de hele Hub antwoordt"
        subtitle="Vraag iets over procedures, opdrachtgevers, nieuws, applicaties of collega's. De Vraagbaak doorzoekt alle bronnen in TerreVolt Hub."
      />

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-pastel/50 via-card to-lime-soft/40 p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-navy">Vraagbaak assistent</div>
            <div className="text-xs text-foreground/70">
              Antwoorden zijn altijd voorzien van bronnen — kennisbank, nieuws, mensen, applicaties en meer.
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
            placeholder="Bijv. Wie heeft BEI-3? of Waar boek ik mijn uren?"
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Vraag
            </button>
          </div>
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

      {loading && (
        <div className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
        </div>
      )}

      {answer && !loading && (
        <div className="mt-6 space-y-6">
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
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{answer.short_answer}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-base leading-relaxed text-navy">{answer.short_answer}</p>

            {answer.steps.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Stappen
                </div>
                <ol className="space-y-2">
                  {answer.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/85">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {answer.summary && (
              <div className="rounded-2xl bg-accent/40 p-4 text-sm text-foreground/85">
                {answer.summary}
              </div>
            )}
          </div>
        )}

        {/* Sources */}
        {answer.sources.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bronnen
            </div>
            <ol className="grid gap-2">
              {answer.sources.map((s, i) => (
                <li key={`${s.source_type}:${s.source_id}:${i}`}>
                  <SourceRow source={s} index={i + 1} />
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

function SourceRow({ source, index }: { source: ResolvedSource; index: number }) {
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
        <div className="truncate text-xs text-muted-foreground">
          {SOURCE_LABEL[source.source_type]}
          {source.url ? ` · ${source.url}` : ""}
        </div>
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
