import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="icon-tile size-12">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="max-w-sm text-ink-soft">{message}</p>
      {action}
    </div>
  );
}
