import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

function toPascal(name: string) {
  return (name || "circle")
    .split(/[-_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

/**
 * Unified icon for the whole app.
 * Lucide outline, rounded join, consistent stroke.
 * Accepts kebab-case names like "calendar-days".
 */
export function Icon({ name, className, size = 20, strokeWidth = 1.75 }: Props) {
  const key = toPascal(name);
  const Comp =
    ((Lucide as unknown as Record<string, LucideIcon>)[key] ??
      Lucide.Circle) as LucideIcon;
  return <Comp className={className} size={size} strokeWidth={strokeWidth} />;
}
