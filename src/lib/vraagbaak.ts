import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The generated types may not yet include vraagbaak tables in this turn —
// cast through `any` for from() calls while keeping our own strong types.
const db = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type VraagbaakFeedbackType =
  | "correct"
  | "unclear"
  | "missing_source"
  | "outdated";

export const FEEDBACK_LABELS: Record<VraagbaakFeedbackType, string> = {
  correct: "Antwoord klopt",
  unclear: "Antwoord is onduidelijk",
  missing_source: "Bron ontbreekt",
  outdated: "Verouderde informatie",
};

export type VraagbaakSource = {
  id: string;
  question_id: string;
  article_id: string | null;
  title: string;
  section_heading: string;
  page_number: number | null;
  file_url: string;
  external_url: string;
  last_updated: string | null;
  sort_order: number;
  created_at: string;
};

export type VraagbaakQuestion = {
  id: string;
  question: string;
  short_answer: string;
  steps: string[];
  summary: string;
  follow_ups: string[];
  related_ids: string[];
  has_sources: boolean;
  asked_by: string;
  created_at: string;
  updated_at: string;
};

export type VraagbaakSaved = {
  id: string;
  question_id: string;
  label: string;
  saved_by: string;
  created_at: string;
};

const Q_KEY = ["vraagbaak_questions"] as const;
const SAVED_KEY = ["vraagbaak_saved"] as const;
const SOURCES_KEY = (qid: string) => ["vraagbaak_sources", qid] as const;
const FEEDBACK_KEY = (qid: string) => ["vraagbaak_feedback", qid] as const;

/* ---------- recent questions ---------- */

export function useVraagbaakRecent(limit = 8) {
  return useQuery({
    queryKey: [...Q_KEY, "recent", limit] as const,
    queryFn: async (): Promise<VraagbaakQuestion[]> => {
      const { data, error } = await db
        .from("vraagbaak_questions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as unknown as VraagbaakQuestion[]).map(normalizeQ);
    },
  });
}

function normalizeQ(r: VraagbaakQuestion): VraagbaakQuestion {
  return {
    ...r,
    steps: (r.steps as unknown as string[]) ?? [],
    follow_ups: (r.follow_ups as unknown as string[]) ?? [],
    related_ids: (r.related_ids as unknown as string[]) ?? [],
  };
}

/* ---------- save question ---------- */

export type SaveAnswerInput = {
  question: string;
  short_answer: string;
  steps: string[];
  summary: string;
  follow_ups: string[];
  related_ids: string[];
  has_sources: boolean;
  sources: Array<{
    article_id: string | null;
    source_type: string;
    title: string;
    section_heading: string;
    page_number: number | null;
    file_url: string;
    external_url: string;
    last_updated: string | null;
  }>;
};

export function useSaveAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveAnswerInput): Promise<string> => {
      const { data, error } = await db
        .from("vraagbaak_questions")
        .insert({
          question: input.question,
          short_answer: input.short_answer,
          steps: input.steps,
          summary: input.summary,
          follow_ups: input.follow_ups,
          related_ids: input.related_ids,
          has_sources: input.has_sources,
        })
        .select("id")
        .single();
      if (error) throw error;
      const qid = (data as { id: string }).id;

      if (input.sources.length > 0) {
        const rows = input.sources.map((s, i) => ({
          ...s,
          question_id: qid,
          sort_order: i,
        }));
        const { error: serr } = await db.from("vraagbaak_sources").insert(rows);
        if (serr) throw serr;
      }
      return qid;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: Q_KEY });
    },
  });
}

/* ---------- feedback ---------- */

export function useFeedbackMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      feedback_type: VraagbaakFeedbackType;
      note?: string;
    }) => {
      const { error } = await db.from("vraagbaak_feedback").insert({
        question_id: input.question_id,
        feedback_type: input.feedback_type,
        note: input.note ?? "",
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: FEEDBACK_KEY(vars.question_id) });
    },
  });
}

/* ---------- sources for a saved question ---------- */

export function useQuestionSources(questionId: string | null) {
  return useQuery({
    enabled: !!questionId,
    queryKey: SOURCES_KEY(questionId ?? ""),
    queryFn: async (): Promise<VraagbaakSource[]> => {
      const { data, error } = await db
        .from("vraagbaak_sources")
        .select("*")
        .eq("question_id", questionId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VraagbaakSource[];
    },
  });
}

/* ---------- saved questions ---------- */

export function useSavedQuestions() {
  return useQuery({
    queryKey: SAVED_KEY,
    queryFn: async (): Promise<VraagbaakSaved[]> => {
      const { data, error } = await db
        .from("vraagbaak_saved")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VraagbaakSaved[];
    },
  });
}

export function useSaveBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; label?: string }) => {
      const { error } = await db.from("vraagbaak_saved").insert({
        question_id: input.question_id,
        label: input.label ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_KEY }),
  });
}

export function useRemoveBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("vraagbaak_saved").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_KEY }),
  });
}
