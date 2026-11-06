import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function FormAlert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-control px-3 py-2.5 text-sm",
        tone === "error" ? "bg-danger-50 text-danger-600" : "bg-sanctuary-50 text-sanctuary-700",
      )}
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" />
      {message}
    </p>
  );
}
