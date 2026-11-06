import type { Route } from "next";

export const NAV_ICON_KEYS = [
  "dashboard",
  "people",
  "teams",
  "attendance",
  "finance",
  "inventory",
  "settings",
] as const;

export type NavKey = (typeof NAV_ICON_KEYS)[number];

export type NavItem = {
  readonly key: NavKey;
  readonly href: Route | null;
  readonly label: string;
  readonly shortLabel?: string;
  readonly badge?: string;
};

export const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
