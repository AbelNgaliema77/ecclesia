import {
  Boxes,
  CalendarCheck2,
  LayoutGrid,
  type LucideIcon,
  UsersRound,
  Wallet,
  Workflow,
} from "lucide-react";
import type { NavKey } from "./nav-items";

export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutGrid,
  people: UsersRound,
  teams: Workflow,
  attendance: CalendarCheck2,
  finance: Wallet,
  inventory: Boxes,
};
