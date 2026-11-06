import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-sanctuary-700 text-white hover:bg-sanctuary-800 active:bg-sanctuary-900 disabled:bg-sanctuary-200",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink-faint hover:bg-paper disabled:text-ink-faint",
  ghost: "text-ink-soft hover:bg-sanctuary-50 hover:text-ink disabled:text-ink-faint",
  danger: "bg-danger-600 text-white hover:brightness-95 disabled:opacity-60",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const buttonClasses = (variant: ButtonVariant = "primary", size: ButtonSize = "md") =>
  cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
  );

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses(variant, size), className)} {...props} />;
}
