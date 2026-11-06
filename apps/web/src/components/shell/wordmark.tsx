import { useId } from "react";
import { cn } from "@/lib/cn";

export function Mark({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f9d68" />
          <stop offset="1" stopColor="#0a3d2b" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path
        d="M16 6.5c-3.9 0-7 3.1-7 7v12h4.2v-7.6h5.6v7.6H23v-12c0-3.9-3.1-7-7-7Z"
        fill="#f1fbf6"
      />
      <rect x="15.2" y="9.2" width="1.6" height="5.6" rx="0.5" fill="#e0a526" />
      <rect x="13.3" y="11.1" width="5.4" height="1.6" rx="0.5" fill="#e0a526" />
    </svg>
  );
}

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark />
      <span
        className={cn(
          "font-display text-[1.375rem] font-bold tracking-tight",
          inverted ? "text-hero-ink" : "text-ink",
        )}
      >
        Ecclesia
      </span>
    </span>
  );
}
