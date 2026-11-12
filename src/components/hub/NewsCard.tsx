import { type NewsArticle, formatNewsDate } from "@/lib/news";
import { Pin } from "lucide-react";

export function NewsCard({ item }: { item: NewsArticle }) {
  return (
    <article id={item.id} className="group flex scroll-mt-20 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors hover:border-brand/50">
      <div className="relative aspect-[16/10] overflow-hidden bg-accent">
        {item.cover_image ? (
          <img
            src={item.cover_image}
            alt={item.title}
            loading="lazy"
            width={800}
            height={512}
            className="h-full w-full object-cover transition-transform duration-500 "
          />
        ) : null}
        {item.important && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground shadow-sm">
            <Pin className="h-3 w-3" /> Belangrijk
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 font-medium text-navy">
            {item.category}
          </span>
          <span className="text-muted-foreground">{formatNewsDate(item.publish_date)}</span>
        </div>
        <h3 className="mt-2 break-words text-base font-semibold leading-snug text-navy">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 text-sm text-foreground/70">{item.summary}</p>
        {item.author && (
          <p className="mt-3 text-xs text-muted-foreground">Door {item.author}</p>
        )}
      </div>
    </article>
  );
}
