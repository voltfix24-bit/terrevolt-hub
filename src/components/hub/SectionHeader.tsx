export function SectionHeader({
  title,
  subtitle,
  action,
  as = "h2",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  const H = as;
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <H className="break-words text-lg font-semibold tracking-tight text-navy sm:text-xl">
          {title}
        </H>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
