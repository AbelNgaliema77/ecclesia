import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function BackLink({ href, label }: { href: Route; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-ink-soft hover:text-ink"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {label}
    </Link>
  );
}
