"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ICONS } from "./nav-icon";
import { isActivePath, type NavItem } from "./nav-items";

export function TabBar({ items, label }: { items: readonly NavItem[]; label: string }) {
  const pathname = usePathname();
  const tabs = items.filter((item) => item.href !== null).slice(0, 5);
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-hero border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur lg:hidden"
    >
      <ul className="flex">
        {tabs.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const active = item.href ? isActivePath(pathname, item.href) : false;
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href ?? "/"}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-card text-[0.6875rem] font-semibold transition-colors",
                  active ? "bg-brand-soft text-brand-soft-ink" : "text-ink-faint active:bg-muted",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2.25 : 1.9} />
                {item.shortLabel ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
