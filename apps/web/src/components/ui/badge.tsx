import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "sanctuary" | "sanctuaryStrong" | "candle" | "muted";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-paper text-ink-soft ring-line-strong",
  sanctuary: "bg-sanctuary-50 text-sanctuary-700 ring-sanctuary-100",
  sanctuaryStrong: "bg-sanctuary-700 text-white ring-sanctuary-700",
  candle: "bg-candle-100 text-candle-700 ring-candle-100",
  muted: "bg-transparent text-ink-faint ring-line",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
