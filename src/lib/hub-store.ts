import { create } from "zustand";
import { persist } from "zustand/middleware";
import newsPlanner from "@/assets/news-planner.jpg";
import newsBei from "@/assets/news-bei.jpg";
import newsBus from "@/assets/news-bus.jpg";

export type AppAccent = "brand" | "pastel" | "lime" | "navy";

export type AppItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  href: string;
  featured: boolean;
  newTab: boolean;
  accent: AppAccent;
};

export type NewsItem = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  image: string;
  date: string;
  important: boolean;
};

export type PartnerLink = { id: string; name: string; href: string };
export type QuickLink = { id: string; name: string; href: string; icon?: string };
export type KnowledgeCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
};

type State = {
  apps: AppItem[];
  news: NewsItem[];
  partners: PartnerLink[];
  quickLinks: QuickLink[];
  knowledge: KnowledgeCategory[];
};

type Actions = {
  // generic
  reorder: <K extends keyof State>(key: K, from: number, to: number) => void;
  // apps
  addApp: (item: Omit<AppItem, "id">) => void;
  updateApp: (id: string, patch: Partial<AppItem>) => void;
  deleteApp: (id: string) => void;
  // news
  addNews: (item: Omit<NewsItem, "id">) => void;
  updateNews: (id: string, patch: Partial<NewsItem>) => void;
  deleteNews: (id: string) => void;
  // partners
  addPartner: (item: Omit<PartnerLink, "id">) => void;
  updatePartner: (id: string, patch: Partial<PartnerLink>) => void;
  deletePartner: (id: string) => void;
  // quick links
  addQuickLink: (item: Omit<QuickLink, "id">) => void;
  updateQuickLink: (id: string, patch: Partial<QuickLink>) => void;
  deleteQuickLink: (id: string) => void;
  // knowledge
  addKnowledge: (item: Omit<KnowledgeCategory, "id">) => void;
  updateKnowledge: (id: string, patch: Partial<KnowledgeCategory>) => void;
  deleteKnowledge: (id: string) => void;
  // reset
  resetAll: () => void;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const defaults: State = {
  apps: [
    { id: uid(), name: "TerreVolt Planner", description: "Beheer planningen, ploegen en projectcapaciteit.", icon: "calendar-days", category: "Operatie", href: "/planner", featured: true, newTab: false, accent: "brand" },
    { id: uid(), name: "Urenregistratie", description: "Boek snel en nauwkeurig uren op projecten.", icon: "clock", category: "Operatie", href: "/uren", featured: true, newTab: false, accent: "lime" },
    { id: uid(), name: "Aardingsrapporten", description: "Maak en beheer aardingsrapporten.", icon: "zap", category: "Techniek", href: "/aarding", featured: false, newTab: false, accent: "pastel" },
    { id: uid(), name: "Materiaal Configurator", description: "Stel materialenlijsten samen voor projecten.", icon: "wrench", category: "Techniek", href: "/materiaal", featured: false, newTab: false, accent: "navy" },
    { id: uid(), name: "Haspelregistratie", description: "Registreer haspels, meterstanden en projectverbruik.", icon: "cable", category: "Techniek", href: "/haspels", featured: false, newTab: false, accent: "brand" },
    { id: uid(), name: "SharePoint", description: "Open de centrale documentomgeving.", icon: "folder", category: "Documenten", href: "https://sharepoint.com", featured: false, newTab: true, accent: "pastel" },
  ],
  news: [
    { id: uid(), title: "Nieuwe versie TerreVolt Planner beschikbaar", category: "Product", excerpt: "Een vernieuwde planningsweergave, snellere ploegtoewijzing en verbeterde capaciteitsoverzichten.", image: newsPlanner, date: "2 juni 2026", important: true },
    { id: uid(), title: "Nieuwe BEI update gepubliceerd", category: "Veiligheid", excerpt: "Belangrijke wijzigingen in de Bedrijfsvoering Elektrische Installaties. Lees wat er voor jouw werk verandert.", image: newsBei, date: "28 mei 2026", important: false },
    { id: uid(), title: "Nieuwe bedrijfsbus geleverd", category: "Bedrijf", excerpt: "Het wagenpark is uitgebreid met een volledig ingerichte servicebus voor montageteams.", image: newsBus, date: "21 mei 2026", important: false },
  ],
  partners: [
    { id: uid(), name: "Liander", href: "https://liander.nl" },
    { id: uid(), name: "Van Gelder", href: "https://vangelder.com" },
    { id: uid(), name: "JR Infra", href: "https://jrinfra.nl" },
    { id: uid(), name: "Hanab", href: "https://hanab.nl" },
    { id: uid(), name: "Moneybird", href: "https://moneybird.nl" },
    { id: uid(), name: "Microsoft 365", href: "https://microsoft365.com" },
    { id: uid(), name: "SharePoint", href: "https://sharepoint.com" },
  ],
  quickLinks: [
    { id: uid(), name: "Outlook", href: "https://outlook.office.com", icon: "mail" },
    { id: uid(), name: "Teams", href: "https://teams.microsoft.com", icon: "message-square" },
    { id: uid(), name: "Intranet", href: "https://sharepoint.com", icon: "home" },
  ],
  knowledge: [
    { id: uid(), slug: "werkvoorbereiding", name: "Werkvoorbereiding", description: "Procedures, checklists en templates.", icon: "clipboard-list" },
    { id: uid(), slug: "veiligheid", name: "Veiligheid", description: "Veiligheidsinstructies en VCA.", icon: "shield-check" },
    { id: uid(), slug: "bei", name: "BEI", description: "Bedrijfsvoering elektrische installaties.", icon: "zap" },
    { id: uid(), slug: "aarding", name: "Aarding", description: "Richtlijnen en meetmethodes.", icon: "globe" },
    { id: uid(), slug: "ls-meten", name: "LS Meten", description: "Laagspanning meetprocedures.", icon: "ruler" },
    { id: uid(), slug: "materialen", name: "Materialen", description: "Specificaties en leveranciers.", icon: "package" },
    { id: uid(), slug: "uren-boeken", name: "Uren boeken", description: "Handleidingen en tips.", icon: "⏱️" },
    { id: uid(), slug: "bedrijfsprocessen", name: "Bedrijfsprocessen", description: "Interne workflows en afspraken.", icon: "🏢" },
  ],
};

function move<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const useHubStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...defaults,
      reorder: (key, from, to) =>
        set((s) => ({ ...s, [key]: move(s[key] as unknown[], from, to) as never })),

      addApp: (item) => set((s) => ({ apps: [...s.apps, { ...item, id: uid() }] })),
      updateApp: (id, patch) =>
        set((s) => ({ apps: s.apps.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteApp: (id) => set((s) => ({ apps: s.apps.filter((a) => a.id !== id) })),

      addNews: (item) => set((s) => ({ news: [...s.news, { ...item, id: uid() }] })),
      updateNews: (id, patch) =>
        set((s) => ({ news: s.news.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
      deleteNews: (id) => set((s) => ({ news: s.news.filter((n) => n.id !== id) })),

      addPartner: (item) => set((s) => ({ partners: [...s.partners, { ...item, id: uid() }] })),
      updatePartner: (id, patch) =>
        set((s) => ({ partners: s.partners.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePartner: (id) => set((s) => ({ partners: s.partners.filter((p) => p.id !== id) })),

      addQuickLink: (item) => set((s) => ({ quickLinks: [...s.quickLinks, { ...item, id: uid() }] })),
      updateQuickLink: (id, patch) =>
        set((s) => ({ quickLinks: s.quickLinks.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
      deleteQuickLink: (id) => set((s) => ({ quickLinks: s.quickLinks.filter((q) => q.id !== id) })),

      addKnowledge: (item) => set((s) => ({ knowledge: [...s.knowledge, { ...item, id: uid() }] })),
      updateKnowledge: (id, patch) =>
        set((s) => ({ knowledge: s.knowledge.map((k) => (k.id === id ? { ...k, ...patch } : k)) })),
      deleteKnowledge: (id) => set((s) => ({ knowledge: s.knowledge.filter((k) => k.id !== id) })),

      resetAll: () => set(() => ({ ...defaults })),
    }),
    { name: "terrevolt-hub-store", version: 1 },
  ),
);
