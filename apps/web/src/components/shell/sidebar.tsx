"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { NAV_ICONS } from "./nav-icon";
import { isActivePath, type NavItem } from "./nav-items";

type SidebarProps = {
  items: readonly NavItem[];
  label: string;
  header: ReactNode;
  church: ReactNode;
  footer: ReactNode;
};

export function Sidebar({ items, label, header, church, footer }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-3 left-3 z-30 hidden w-64 flex-col rounded-hero border border-line bg-surface p-4 shadow-card lg:flex">
      <div className="px-2 pt-1">{header}</div>
      <div className="mt-6">{church}</div>
      <nav aria-label={label} className="mt-6 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = NAV_ICONS[item.key];
            const active = item.href ? isActivePath(pathname, item.href) : false;
            const body = (
              <>
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-[0.625rem] transition-colors",
                    active ? "bg-brand text-brand-ink" : "text-ink-faint group-hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-[1.0625rem]" strokeWidth={2} />
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-gold-ink">
                    {item.badge}
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={item.key}>
                {item.href ? (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex h-11 items-center gap-3 rounded-control px-1.5 text-[0.9375rem] transition-colors",
                      active
                        ? "bg-brand-soft font-semibold text-brand-soft-ink"
                        : "text-ink-soft hover:bg-muted hover:text-ink",
                    )}
                  >
                    {body}
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className="group flex h-11 items-center gap-3 px-1.5 text-[0.9375rem] text-ink-faint"
                  >
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-line pt-3">{footer}</div>
    </aside>
  );
}
