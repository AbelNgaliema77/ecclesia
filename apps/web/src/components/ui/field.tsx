import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const controlClasses =
  "w-full rounded-control border border-line-strong bg-surface px-3 text-[0.9375rem] text-ink placeholder:text-ink-faint transition-colors hover:border-ink-faint focus:border-sanctuary-500 focus:outline-none focus:ring-2 focus:ring-sanctuary-100 aria-[invalid=true]:border-danger-600 aria-[invalid=true]:ring-danger-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, "h-10 pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "min-h-24 py-2", className)} {...props} />;
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
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optionalLabel ? (
          <span className="ml-1.5 font-normal text-ink-faint">({optionalLabel})</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger-600">
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
