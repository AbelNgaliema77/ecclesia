import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQueuedHeadcount,
  headcountFormData,
  queuedHeadcount,
  queuedHeadcounts,
  queueHeadcount,
} from "./queue";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
    dispatchEvent: () => true,
  });
});

describe("offline headcount queue", () => {
  it("keeps the latest counts per service and church", () => {
    queueHeadcount({ churchId: "c1", serviceId: "s1", counts: { a: 3 } });
    queueHeadcount({ churchId: "c1", serviceId: "s1", counts: { a: 5 } });
    queueHeadcount({ churchId: "c2", serviceId: "s1", counts: { a: 9 } });
    expect(queuedHeadcount("c1", "s1")?.counts).toEqual({ a: 5 });
    expect(queuedHeadcounts("c1")).toHaveLength(1);
    expect(queuedHeadcounts("c2")).toHaveLength(1);
  });

  it("only clears the entry that was synced", () => {
    queueHeadcount({ churchId: "c1", serviceId: "s1", counts: { a: 1 } });
    const synced = queuedHeadcount("c1", "s1");
    clearQueuedHeadcount("c1", "s1", "older");
    expect(queuedHeadcount("c1", "s1")).not.toBeNull();
    clearQueuedHeadcount("c1", "s1", synced?.savedAt);
    expect(queuedHeadcount("c1", "s1")).toBeNull();
  });

  it("ignores corrupt or tampered storage", () => {
    memory.set(
      "ecclesia.headcounts.v1",
      JSON.stringify({ x: { churchId: "c1", serviceId: "s1", savedAt: "t", counts: { a: -4 } } }),
    );
    expect(queuedHeadcounts("c1")).toEqual([]);
    memory.set("ecclesia.headcounts.v1", "{not json");
    expect(queuedHeadcounts("c1")).toEqual([]);
  });

  it("builds the same form fields as the capture screen", () => {
    const data = headcountFormData("s1", { a: 2, b: 0 });
    expect(Object.fromEntries(data.entries())).toEqual({
      serviceId: "s1",
      "count:a": "2",
      "count:b": "0",
    });
  });
});
