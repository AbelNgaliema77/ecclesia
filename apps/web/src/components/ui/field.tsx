import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export const controlClasses =
  "w-full rounded-control border border-line bg-muted px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-faint transition-[border-color,background-color,box-shadow] hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-soft disabled:opacity-70 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-soft";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, "h-11", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, "h-11 pr-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "min-h-28 py-2.5", className)} {...props} />;
}

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  className?: string;
  children: ReactNode;
};

export function Field({ id, label, hint, error, optionalLabel, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optionalLabel ? (
          <span className="ml-1.5 font-normal text-ink-faint">({optionalLabel})</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
