import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type FinanceClient = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  accent: string;
  factuuradres: string;
  inkooporder_info: string;
  factuur_referenties: string;
  verplichte_bijlagen: string;
  btw_verlegd: string;
  g_rekening: string;
  betaaltermijn: string;
  factuur_email: string;
  veelgemaakte_fouten: string;
  voorbeeld_factuurtekst: string;
  interne_opmerkingen: string;
  related_ids: string[];
  archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FinanceClientField =
  | "factuuradres"
  | "inkooporder_info"
  | "factuur_referenties"
  | "verplichte_bijlagen"
  | "btw_verlegd"
  | "g_rekening"
  | "betaaltermijn"
  | "factuur_email"
  | "veelgemaakte_fouten"
  | "voorbeeld_factuurtekst"
  | "interne_opmerkingen";

export const FINANCE_FIELDS: { key: FinanceClientField; label: string; hint?: string }[] = [
  { key: "factuuradres", label: "Factuuradres" },
  { key: "inkooporder_info", label: "Benodigde inkooporderinformatie", hint: "PO-nummer, contactpersoon, project-ID" },
  { key: "factuur_referenties", label: "Verplichte factuurreferenties" },
  { key: "verplichte_bijlagen", label: "Verplichte bijlagen" },
  { key: "btw_verlegd", label: "BTW verlegd instructies" },
  { key: "g_rekening", label: "G-rekening instructies" },
  { key: "betaaltermijn", label: "Betaaltermijn" },
  { key: "factuur_email", label: "E-mailadres voor facturen" },
  { key: "veelgemaakte_fouten", label: "Veelgemaakte fouten" },
  { key: "voorbeeld_factuurtekst", label: "Voorbeeld factuurtekst" },
  { key: "interne_opmerkingen", label: "Interne opmerkingen" },
];

const KEY = ["finance_clients"] as const;

function normalize(r: Record<string, unknown>): FinanceClient {
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    short_description: String(r.short_description ?? ""),
    accent: String(r.accent ?? "brand"),
    factuuradres: String(r.factuuradres ?? ""),
    inkooporder_info: String(r.inkooporder_info ?? ""),
    factuur_referenties: String(r.factuur_referenties ?? ""),
    verplichte_bijlagen: String(r.verplichte_bijlagen ?? ""),
    btw_verlegd: String(r.btw_verlegd ?? ""),
    g_rekening: String(r.g_rekening ?? ""),
    betaaltermijn: String(r.betaaltermijn ?? ""),
    factuur_email: String(r.factuur_email ?? ""),
    veelgemaakte_fouten: String(r.veelgemaakte_fouten ?? ""),
    voorbeeld_factuurtekst: String(r.voorbeeld_factuurtekst ?? ""),
    interne_opmerkingen: String(r.interne_opmerkingen ?? ""),
    related_ids: (r.related_ids as string[]) ?? [],
    archived: Boolean(r.archived ?? false),
    sort_order: Number(r.sort_order ?? 0),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export function useFinanceClients() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<FinanceClient[]> => {
      const { data, error } = await db
        .from("finance_clients")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
    },
  });
}

export function useFinanceClientMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FinanceClient> }) => {
      const { error } = await db.from("finance_clients").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { update };
}

export function financeClientCompletion(c: FinanceClient): number {
  const fields: FinanceClientField[] = FINANCE_FIELDS.map((f) => f.key);
  const filled = fields.filter((f) => (c[f] ?? "").trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}
