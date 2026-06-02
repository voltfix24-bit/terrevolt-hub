import type { NewsItem } from "@/lib/hub-store";

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          width={800}
          height={512}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 font-medium text-navy">
            {item.category}
          </span>
          {item.important && (
            <span className="inline-flex items-center rounded-full bg-brand px-2.5 py-1 font-medium text-brand-foreground">
              Belangrijk
            </span>
          )}
          <span className="text-muted-foreground">{item.date}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-navy">
          {item.title}
        </h3>
        <p className="mt-2 text-sm text-foreground/70">{item.excerpt}</p>
      </div>
    </article>
  );
}
