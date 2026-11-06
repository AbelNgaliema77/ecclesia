import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function FormAlert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-control px-4 py-3 text-sm font-medium",
        tone === "error" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-soft-ink",
      )}
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" />
      {message}
    </p>
  );
}
