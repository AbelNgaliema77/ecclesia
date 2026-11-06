"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";

type UserMenuProps = {
  name: string;
  email: string;
  roleLabel: string;
  signOutLabel: string;
};

export function UserMenu({ name, email, roleLabel, signOutLabel }: UserMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sanctuary-100 text-sm font-semibold text-sanctuary-800"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-ink-faint" title={email}>
          {roleLabel}
        </p>
      </div>
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
        className="inline-flex size-8 items-center justify-center rounded-control text-ink-faint hover:bg-paper hover:text-ink"
        aria-label={signOutLabel}
        title={signOutLabel}
      >
        <LogOut aria-hidden className="size-4" />
      </button>
    </div>
  );
}
