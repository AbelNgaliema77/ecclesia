import { cn } from "@/lib/cn";

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" aria-hidden className="size-7">
        <rect width="32" height="32" rx="7" fill={inverted ? "#f5f6f4" : "#0f4c45"} />
        <path
          d="M16 6.5c-3.9 0-7 3.1-7 7v12h4v-8h6v8h4v-12c0-3.9-3.1-7-7-7Z"
          fill={inverted ? "#0f4c45" : "#f5f6f4"}
        />
        <rect x="15.25" y="9.4" width="1.5" height="5.5" rx="0.4" fill="#b8862b" />
        <rect x="13.4" y="11.25" width="5.2" height="1.5" rx="0.4" fill="#b8862b" />
      </svg>
      <span
        className={cn(
          "font-display text-xl font-medium tracking-tight",
          inverted ? "text-sanctuary-50" : "text-ink",
        )}
      >
        Ecclesia
      </span>
    </span>
  );
}
