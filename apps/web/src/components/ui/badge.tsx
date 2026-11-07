import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "brandStrong" | "gold" | "muted" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-muted text-ink-soft ring-line",
  brand: "bg-brand-soft text-brand-soft-ink ring-transparent",
  brandStrong: "bg-brand text-brand-ink ring-transparent",
  gold: "bg-gold-soft text-gold-ink ring-transparent",
  muted: "bg-transparent text-ink-faint ring-line",
  danger: "bg-danger-soft text-danger ring-transparent",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
