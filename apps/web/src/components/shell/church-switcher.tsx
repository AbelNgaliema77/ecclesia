"use client";

import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchChurchAction } from "@/modules/preferences/actions";

type ChurchSwitcherProps = {
  currentId: string;
  currentName: string;
  churches: readonly { id: string; name: string }[];
  label: string;
};

export function ChurchSwitcher({ currentId, currentName, churches, label }: ChurchSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = currentName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  const badge = (
    <span
      aria-hidden
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-gold-soft text-sm font-bold text-gold-ink"
    >
      {initials}
    </span>
  );

  if (churches.length < 2) {
    return (
      <div className="flex items-center gap-3 rounded-control bg-muted p-2 ring-1 ring-line ring-inset">
        {badge}
        <p className="truncate text-sm font-semibold text-ink">{currentName}</p>
      </div>
    );
  }

  return (
    <label className="relative flex items-center gap-3 rounded-control bg-muted p-2 ring-1 ring-line ring-inset">
      {badge}
      <span className="sr-only">{label}</span>
      <select
        value={currentId}
        disabled={pending}
        onChange={(event) =>
          startTransition(async () => {
            await switchChurchAction(event.target.value);
            router.refresh();
          })
        }
        className="min-w-0 flex-1 appearance-none truncate bg-transparent pr-6 text-sm font-semibold text-ink focus:outline-none"
      >
        {churches.map((church) => (
          <option key={church.id} value={church.id}>
            {church.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown
        aria-hidden
        className="pointer-events-none absolute right-3 size-4 text-ink-faint"
      />
    </label>
  );
}
