import { DynamicIcon, type IconName } from "lucide-react/dynamic";

type Props = {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

/**
 * Unified icon for the whole app.
 * Always uses Lucide (outline, rounded join, consistent stroke).
 * Accepts kebab-case names like "calendar-days", "shield-check".
 */
export function Icon({ name, className, size = 20, strokeWidth = 1.75 }: Props) {
  return (
    <DynamicIcon
      name={(name || "circle") as IconName}
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      fallback={() => (
        <span
          aria-hidden
          style={{ width: size, height: size }}
          className="inline-block rounded-md bg-current/10"
        />
      )}
    />
  );
}
