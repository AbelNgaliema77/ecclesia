"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeLabel: string;
  size?: "md" | "lg";
  children: ReactNode;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  size = "md",
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] overflow-visible rounded-hero border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/35 backdrop:backdrop-blur-sm open:page-enter",
        size === "lg" ? "max-w-2xl" : "max-w-lg",
      )}
    >
      {open ? (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start gap-4 px-6 pt-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-bold">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-ink-soft">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-muted hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </header>
          <div className="overflow-y-auto px-6 pt-5 pb-6">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
