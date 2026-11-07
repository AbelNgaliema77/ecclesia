"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function SettingsTabs({
  tabs,
  label,
  root = "/settings",
}: {
  tabs: readonly { href: Route; label: string }[];
  label: string;
  root?: string;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line ring-inset">
        {tabs.map((tab) => {
          const active = tab.href === root ? pathname === root : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "bg-brand text-brand-ink"
                    : "text-ink-soft hover:bg-muted hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
