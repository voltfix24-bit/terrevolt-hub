import newsPlanner from "@/assets/news-planner.jpg";
import newsBei from "@/assets/news-bei.jpg";
import newsBus from "@/assets/news-bus.jpg";

export type AppItem = {
  id: string;
  name: string;
  description: string;
  href: string;
  external: boolean;
  featured?: boolean;
  icon: string; // emoji as lightweight stand-in
  accent: "brand" | "pastel" | "lime" | "navy";
};

export const apps: AppItem[] = [
  {
    id: "planner",
    name: "TerreVolt Planner",
    description: "Beheer planningen, ploegen en projectcapaciteit.",
    href: "/planner",
    external: false,
    featured: true,
    icon: "📅",
    accent: "brand",
  },
  {
    id: "uren",
    name: "Urenregistratie",
    description: "Boek snel en nauwkeurig uren op projecten.",
    href: "/uren",
    external: false,
    featured: true,
    icon: "⏱️",
    accent: "lime",
  },
  {
    id: "aarding",
    name: "Aardingsrapporten",
    description: "Maak en beheer aardingsrapporten.",
    href: "/aarding",
    external: false,
    icon: "⚡",
    accent: "pastel",
  },
  {
    id: "materiaal",
    name: "Materiaal Configurator",
    description: "Stel materialenlijsten samen voor projecten.",
    href: "/materiaal",
    external: false,
    icon: "🧰",
    accent: "navy",
  },
  {
    id: "haspels",
    name: "Haspelregistratie",
    description: "Registreer haspels, meterstanden en projectverbruik.",
    href: "/haspels",
    external: false,
    icon: "🔌",
    accent: "brand",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    description: "Open de centrale documentomgeving.",
    href: "https://sharepoint.com",
    external: true,
    icon: "📁",
    accent: "pastel",
  },
];

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  image: string;
};

export const news: NewsItem[] = [
  {
    id: "1",
    title: "Nieuwe versie TerreVolt Planner beschikbaar",
    excerpt:
      "Een vernieuwde planningsweergave, snellere ploegtoewijzing en verbeterde capaciteitsoverzichten.",
    category: "Product",
    date: "2 juni 2026",
    image: newsPlanner,
  },
  {
    id: "2",
    title: "Nieuwe BEI update gepubliceerd",
    excerpt:
      "Belangrijke wijzigingen in de Bedrijfsvoering Elektrische Installaties. Lees wat er voor jouw werk verandert.",
    category: "Veiligheid",
    date: "28 mei 2026",
    image: newsBei,
  },
  {
    id: "3",
    title: "Nieuwe bedrijfsbus geleverd",
    excerpt:
      "Het wagenpark is uitgebreid met een volledig ingerichte servicebus voor montageteams.",
    category: "Bedrijf",
    date: "21 mei 2026",
    image: newsBus,
  },
];

export type PartnerLink = {
  id: string;
  name: string;
  href: string;
};

export const partners: PartnerLink[] = [
  { id: "liander", name: "Liander", href: "https://liander.nl" },
  { id: "vangelder", name: "Van Gelder", href: "https://vangelder.com" },
  { id: "jrinfra", name: "JR Infra", href: "https://jrinfra.nl" },
  { id: "hanab", name: "Hanab", href: "https://hanab.nl" },
  { id: "moneybird", name: "Moneybird", href: "https://moneybird.nl" },
  { id: "microsoft", name: "Microsoft 365", href: "https://microsoft365.com" },
  { id: "sharepoint", name: "SharePoint", href: "https://sharepoint.com" },
];

export type KnowledgeCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
};

export const knowledge: KnowledgeCategory[] = [
  { id: "1", slug: "werkvoorbereiding", name: "Werkvoorbereiding", description: "Procedures, checklists en templates.", icon: "📋" },
  { id: "2", slug: "veiligheid", name: "Veiligheid", description: "Veiligheidsinstructies en VCA.", icon: "🦺" },
  { id: "3", slug: "bei", name: "BEI", description: "Bedrijfsvoering elektrische installaties.", icon: "⚡" },
  { id: "4", slug: "aarding", name: "Aarding", description: "Richtlijnen en meetmethodes.", icon: "🌍" },
  { id: "5", slug: "ls-meten", name: "LS Meten", description: "Laagspanning meet­procedures.", icon: "📏" },
  { id: "6", slug: "materialen", name: "Materialen", description: "Specificaties en leveranciers.", icon: "🧰" },
  { id: "7", slug: "uren-boeken", name: "Uren boeken", description: "Handleidingen en tips.", icon: "⏱️" },
  { id: "8", slug: "bedrijfsprocessen", name: "Bedrijfsprocessen", description: "Interne workflows en afspraken.", icon: "🏢" },
];
