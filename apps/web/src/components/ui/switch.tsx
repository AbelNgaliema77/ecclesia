"use client";

import { type ChangeEvent, useId } from "react";

type SwitchProps = {
  label: string;
  hint?: string;
} & (
  | { name: string; defaultChecked?: boolean; checked?: never; onCheckedChange?: never }
  | {
      name?: never;
      defaultChecked?: never;
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
    }
);

export function Switch({ label, hint, ...state }: SwitchProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          {...(state.onCheckedChange
            ? {
                checked: state.checked,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  state.onCheckedChange(event.target.checked),
              }
            : { name: state.name, defaultChecked: state.defaultChecked ?? false })}
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
