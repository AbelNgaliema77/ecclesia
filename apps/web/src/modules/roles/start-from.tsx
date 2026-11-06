"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import { Select } from "@/components/ui/field";

type StartFromProps = {
  label: string;
  blankLabel: string;
  value: string;
  options: readonly { id: string; label: string }[];
};

export function StartFrom({ label, blankLabel, value, options }: StartFromProps) {
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-sm font-semibold text-ink-soft">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        className="w-56"
        onChange={(event) =>
          router.replace(
            (event.target.value
              ? `/settings/roles/new?from=${event.target.value}`
              : "/settings/roles/new") as "/settings/roles/new",
          )
        }
      >
        <option value="">{blankLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
