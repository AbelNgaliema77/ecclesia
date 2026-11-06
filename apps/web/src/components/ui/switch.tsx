"use client";

import { useId } from "react";

type SwitchProps = {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
};

export function Switch({ name, label, hint, defaultChecked = false }: SwitchProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-line-strong transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-card transition-transform peer-checked:translate-x-5" />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint ? <span className="text-sm text-ink-faint">{hint}</span> : null}
      </span>
    </label>
  );
}
