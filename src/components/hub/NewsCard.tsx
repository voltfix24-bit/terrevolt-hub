import { type NewsArticle, formatNewsDate } from "@/lib/news";
import { Pin } from "lucide-react";

export function NewsCard({ item }: { item: NewsArticle }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="relative aspect-[16/10] overflow-hidden bg-accent">
        {item.cover_image ? (
          <img
            src={item.cover_image}
            alt={item.title}
            loading="lazy"
            width={800}
            height={512}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        {item.important && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground shadow-sm">
            <Pin className="h-3 w-3" /> Belangrijk
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 font-medium text-navy">
            {item.category}
          </span>
          <span className="text-muted-foreground">{formatNewsDate(item.publish_date)}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-navy">
          {item.title}
        </h3>
        <p className="mt-2 text-sm text-foreground/70">{item.summary}</p>
        {item.author && (
          <p className="mt-3 text-xs text-muted-foreground">Door {item.author}</p>
        )}
      </div>
    </article>
  );
}
