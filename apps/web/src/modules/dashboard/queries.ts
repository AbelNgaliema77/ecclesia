import "server-only";
import { attendance, people, teams } from "@ecclesia/db/repositories";
import { summarizeByMonth } from "@ecclesia/domain/attendance";
import { type Season, seasonForMonth } from "@ecclesia/domain/calendar";
import { lastNMonthKeys, type MonthKey, percentChange } from "@ecclesia/domain/shared";
import { readChurch } from "@/server/queries";

export type TrendPoint = {
  readonly month: MonthKey;
  readonly season: Season | null;
  readonly services: number;
  readonly averagePerService: number;
  readonly byCategory: Readonly<Record<string, number>>;
};

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

const MONTHS = 12;

export const loadDashboard = async () =>
  readChurch("attendance.read", async ({ tx }) => {
    const now = new Date();
    const months = lastNMonthKeys(now, MONTHS);
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    const [records, categories, recent, statusCounts, firstTimers, serving] = await Promise.all([
      attendance.headcountRecordsSince(tx, since),
      attendance.listAttendanceCategories(tx),
      attendance.listRecentServices(tx, 6),
      people.countPeopleByStatus(tx),
      people.countFirstVisitsSince(tx, thirtyDaysAgo),
      teams.countPeopleServing(tx),
    ]);

    const monthly = summarizeByMonth(records, months);
    const trend: TrendPoint[] = monthly.map((m) => ({
      month: m.month,
      season: seasonForMonth(m.month),
      services: m.services,
      averagePerService: m.averagePerService,
      byCategory: Object.fromEntries(
        categories.map((c) => [
          c.id,
          m.services === 0 ? 0 : Math.round((m.byCategory[c.id] ?? 0) / m.services),
        ]),
      ),
    }));

    const completed = trend.slice(0, -1).filter((m) => m.services > 0);
    const latest = completed.at(-1) ?? null;
    const previous = completed.at(-2) ?? null;

    return {
      categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
      trend,
      latest,
      change:
        latest && previous
          ? percentChange(previous.averagePerService, latest.averagePerService)
          : null,
      firstTimers,
      peopleTotal: statusCounts
        .filter((s) => s.status !== "inactive")
        .reduce((sum, s) => sum + s.total, 0),
      serving,
      recent,
    };
  });
