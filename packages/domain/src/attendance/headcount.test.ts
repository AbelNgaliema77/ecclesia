import { describe, expect, it } from "vitest";
import { headcountSubmissionSchema, monthOverMonth, summarizeByMonth } from "./headcount";

const men = "00000000-0000-4000-8000-000000000001";
const women = "00000000-0000-4000-8000-000000000002";
const service = "00000000-0000-4000-8000-0000000000aa";

describe("headcountSubmissionSchema", () => {
  it("rejects negative and fractional counts", () => {
    expect(
      headcountSubmissionSchema.safeParse({
        serviceId: service,
        entries: [{ categoryId: men, count: -1 }],
      }).success,
    ).toBe(false);
    expect(
      headcountSubmissionSchema.safeParse({
        serviceId: service,
        entries: [{ categoryId: men, count: 2.5 }],
      }).success,
    ).toBe(false);
  });

  it("rejects the same category twice", () => {
    const result = headcountSubmissionSchema.safeParse({
      serviceId: service,
      entries: [
        { categoryId: men, count: 10 },
        { categoryId: men, count: 12 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("coerces form strings to numbers", () => {
    const parsed = headcountSubmissionSchema.parse({
      serviceId: service,
      entries: [{ categoryId: men, count: "42" }],
    });
    expect(parsed.entries[0]?.count).toBe(42);
  });
});

describe("summarizeByMonth", () => {
  const records = [
    { serviceId: "s1", occurredAt: new Date("2026-09-06T08:00:00Z"), categoryId: men, count: 40 },
    { serviceId: "s1", occurredAt: new Date("2026-09-06T08:00:00Z"), categoryId: women, count: 60 },
    { serviceId: "s2", occurredAt: new Date("2026-10-04T08:00:00Z"), categoryId: men, count: 50 },
    { serviceId: "s2", occurredAt: new Date("2026-10-04T08:00:00Z"), categoryId: women, count: 70 },
    { serviceId: "s3", occurredAt: new Date("2026-10-11T08:00:00Z"), categoryId: men, count: 45 },
    { serviceId: "s3", occurredAt: new Date("2026-10-11T08:00:00Z"), categoryId: women, count: 75 },
  ];

  it("totals per month and category, including empty months", () => {
    const series = summarizeByMonth(records, ["2026-08", "2026-09", "2026-10"]);
    expect(series.map((m) => m.total)).toEqual([0, 100, 240]);
    expect(series[2]?.byCategory[men]).toBe(95);
    expect(series[2]?.services).toBe(2);
    expect(series[2]?.averagePerService).toBe(120);
  });

  it("compares average per service month over month", () => {
    const series = summarizeByMonth(records, ["2026-09", "2026-10"]);
    expect(monthOverMonth(series)).toBe(20);
  });
});
