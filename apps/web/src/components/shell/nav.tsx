"use client";

import {
  Boxes,
  CalendarCheck,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  Settings,
  Users,
  Wallet,
  Workflow,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const ICONS = {
  dashboard: LayoutDashboard,
  people: Users,
  teams: Workflow,
  attendance: CalendarCheck,
  finance: Wallet,
  inventory: Boxes,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type NavItem = {
  readonly key: keyof typeof ICONS;
  readonly href: Route | null;
  readonly label: string;
  readonly badge?: string;
};

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

function NavList({ items, label }: { items: readonly NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          const content = (
            <>
              <Icon aria-hidden className="size-[1.125rem] shrink-0" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-paper px-2 py-0.5 text-[0.6875rem] text-ink-faint ring-1 ring-line">
                  {item.badge}
                </span>
              ) : null}
            </>
          );
          if (!item.href) {
            return (
              <li key={item.key}>
                <span
                  aria-disabled
                  className="flex h-9 items-center gap-3 rounded-control px-3 text-sm text-ink-faint"
                >
                  {content}
                </span>
              </li>
            );
          }
          const active = isActive(pathname, item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 items-center gap-3 rounded-control px-3 text-sm transition-colors",
                  active
                    ? "bg-sanctuary-50 font-medium text-sanctuary-800 before:absolute before:inset-y-2 before:-left-3 before:w-0.5 before:rounded-full before:bg-sanctuary-700"
                    : "text-ink-soft hover:bg-paper hover:text-ink",
                )}
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type SidebarProps = {
  items: readonly NavItem[];
  navLabel: string;
  openLabel: string;
  closeLabel: string;
  header: ReactNode;
  footer: ReactNode;
};

export function Sidebar({ items, navLabel, openLabel, closeLabel, header, footer }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-control text-ink-soft hover:bg-surface lg:hidden"
        aria-label={openLabel}
        aria-expanded={open}
        aria-controls="app-sidebar"
      >
        <Menu aria-hidden className="size-5" />
      </button>
      {open ? (
        <button
          type="button"
          aria-label={closeLabel}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
        />
      ) : null}
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface px-3 py-5 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-3">
          {header}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-8 items-center justify-center rounded-control text-ink-faint hover:bg-paper lg:hidden"
            aria-label={closeLabel}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="mt-8 flex-1 overflow-y-auto pl-3">
          <NavList items={items} label={navLabel} />
        </div>
        <div className="border-t border-line px-3 pt-4">{footer}</div>
      </aside>
    </>
  );
}
