import { type Actor, can, FINANCE_PERMISSIONS, type Permission } from "@ecclesia/domain/access";
import type { Route } from "next";

export const canOpenFinance = (actor: Actor, financeLocked: boolean): boolean =>
  financeLocked || FINANCE_PERMISSIONS.some((permission) => can(actor, permission));

export type FinanceTab = {
  readonly key: string;
  readonly href: Route;
  readonly anyOf: readonly Permission[];
};

export const FINANCE_TABS: readonly FinanceTab[] = [
  {
    key: "overview",
    href: "/finance",
    anyOf: ["giving.readTotals", "payments.approve", "budgets.read"],
  },
  { key: "giving", href: "/finance/giving", anyOf: ["giving.readIndividual", "giving.capture"] },
  { key: "counts", href: "/finance/counts", anyOf: ["giving.capture"] },
  { key: "bank", href: "/finance/bank", anyOf: ["giving.capture"] },
  { key: "donors", href: "/finance/donors", anyOf: ["giving.readIndividual"] },
  { key: "expenses", href: "/finance/expenses", anyOf: ["payments.request", "payments.approve"] },
  { key: "budgets", href: "/finance/budgets", anyOf: ["budgets.read"] },
  { key: "reports", href: "/finance/reports", anyOf: ["giving.readTotals"] },
  { key: "settings", href: "/finance/settings", anyOf: ["finance.manage"] },
];

export const visibleFinanceTabs = (actor: Actor) =>
  FINANCE_TABS.filter((tab) => tab.anyOf.some((permission) => can(actor, permission)));
