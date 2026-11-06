"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef, useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

type AccountMenuProps = {
  name: string;
  email: string;
  roleLabel: string;
  signOutLabel: string;
  accountLabel: string;
  compact?: boolean;
  placement?: "up" | "down";
  children: ReactNode;
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export function AccountMenu({
  name,
  email,
  roleLabel,
  signOutLabel,
  accountLabel,
  compact = false,
  placement = "up",
  children,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatar = (
    <span
      aria-hidden
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#0a3d2b] text-sm font-bold text-white"
    >
      {initialsOf(name)}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={accountLabel}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-control text-left transition-colors hover:bg-muted",
          compact ? "p-0.5" : "p-1.5",
        )}
      >
        {avatar}
        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{name}</span>
            <span className="block truncate text-xs text-ink-faint">{roleLabel}</span>
          </span>
        )}
      </button>
      {open ? (
        <div
          id={panelId}
          className={cn(
            "absolute z-50 w-72 rounded-card border border-line bg-surface p-3 shadow-pop page-enter",
            placement === "up" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2",
          )}
        >
          <div className="flex items-center gap-3 px-1 pb-3">
            {avatar}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-ink-faint">{email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line px-1 py-3">{children}</div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await authClient.signOut();
                router.replace("/sign-in");
                router.refresh();
              })
            }
            className="flex h-10 w-full items-center gap-2.5 rounded-control px-2 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <LogOut aria-hidden className="size-4" />
            {signOutLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
