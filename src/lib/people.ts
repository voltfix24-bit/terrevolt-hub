import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export const PERSON_TYPES = [
  "Medewerker",
  "ZZP'er",
  "Monteur",
  "Werkvoorbereider",
  "Projectleider",
  "Administratie",
  "Directie",
  "Magazijn",
  "Externe partner",
] as const;
export type PersonType = (typeof PERSON_TYPES)[number];

export const PERSON_STATUSES = [
  "Beschikbaar",
  "Bezet",
  "Op project",
  "Afwezig",
  "Verlof",
  "Niet actief",
] as const;
export type PersonStatus = (typeof PERSON_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["Vast", "Tijdelijk", "ZZP", "Inhuur", "Stage"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export type Person = {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  person_type: PersonType;
  employment_type: string;
  status: PersonStatus;
  photo_url: string;
  phone: string;
  email: string;
  location: string;
  projects: string[];
  certifications: string[];
  bei_authorization: string;
  vehicle: string;
  equipment: string;
  emergency_contact: string;
  emergency_admin_only: boolean;
  hidden_fields: string[];
  notes: string;
  archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const STATUS_STYLES: Record<PersonStatus, string> = {
  "Beschikbaar": "bg-lime-soft text-navy border-lime/40",
  "Bezet": "bg-amber-100 text-amber-900 border-amber-200",
  "Op project": "bg-pastel/60 text-navy border-brand/30",
  "Afwezig": "bg-muted text-muted-foreground border-border",
  "Verlof": "bg-sky-100 text-sky-900 border-sky-200",
  "Niet actief": "bg-rose-100 text-rose-900 border-rose-200",
};

const KEY = ["people"] as const;

function normalize(r: Record<string, unknown>): Person {
  return {
    id: String(r.id),
    full_name: String(r.full_name ?? ""),
    job_title: String(r.job_title ?? ""),
    department: String(r.department ?? ""),
    person_type: (r.person_type as PersonType) ?? "Medewerker",
    employment_type: String(r.employment_type ?? "Vast"),
    status: (r.status as PersonStatus) ?? "Beschikbaar",
    photo_url: String(r.photo_url ?? ""),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    location: String(r.location ?? ""),
    projects: (r.projects as string[]) ?? [],
    certifications: (r.certifications as string[]) ?? [],
    bei_authorization: String(r.bei_authorization ?? ""),
    vehicle: String(r.vehicle ?? ""),
    equipment: String(r.equipment ?? ""),
    emergency_contact: String(r.emergency_contact ?? ""),
    emergency_admin_only: Boolean(r.emergency_admin_only ?? true),
    hidden_fields: (r.hidden_fields as string[]) ?? [],
    notes: String(r.notes ?? ""),
    archived: Boolean(r.archived ?? false),
    sort_order: Number(r.sort_order ?? 0),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export function usePeople() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Person[]> => {
      const { data, error } = await db
        .from("people")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => normalize(r));
    },
  });
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: ["person", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Person | null> => {
      if (!id) return null;
      const { data, error } = await db.from("people").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? normalize(data as Record<string, unknown>) : null;
    },
  });
}

export function usePeopleMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["person"] });
  };

  const create = useMutation({
    mutationFn: async (input: Partial<Person> & { full_name: string }) => {
      const { error } = await db.from("people").insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Person> }) => {
      const { error } = await db.from("people").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function isAdminRole(role: string): boolean {
  return role === "Directeur" || role === "Administratie";
}
