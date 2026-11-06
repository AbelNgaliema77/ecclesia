"use client";

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

  if (churches.length < 2) {
    return <p className="truncate text-sm font-medium text-ink">{currentName}</p>;
  }

  return (
    <label className="block">
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
        className="h-9 max-w-64 rounded-control border border-line-strong bg-surface px-2 text-sm font-medium"
      >
        {churches.map((church) => (
          <option key={church.id} value={church.id}>
            {church.name}
          </option>
        ))}
      </select>
    </label>
  );
}
