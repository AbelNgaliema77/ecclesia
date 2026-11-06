import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-ink shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_6px_16px_-6px_rgb(15_107_71/0.55)] hover:bg-brand-hover disabled:opacity-50",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink-faint hover:bg-muted disabled:text-ink-faint",
  soft: "bg-brand-soft text-brand-soft-ink hover:brightness-95 disabled:opacity-50",
  ghost: "text-ink-soft hover:bg-muted hover:text-ink disabled:text-ink-faint",
  danger: "bg-danger text-white hover:brightness-95 disabled:opacity-60",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
};

export const buttonClasses = (variant: ButtonVariant = "primary", size: ButtonSize = "md") =>
  cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-[background-color,transform,filter,border-color] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100",
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
