import { describe, expect, it } from "vitest";
import {
  categorySchema,
  churchSettingsSchema,
  reorder,
  serviceTypeSchema,
} from "./church-settings";

describe("churchSettingsSchema", () => {
  it("accepts real time zones and rejects made-up ones", () => {
    const base = { name: "La Borne", defaultLocale: "fr", currency: "ZAR" };
    expect(
      churchSettingsSchema.safeParse({ ...base, timezone: "Africa/Johannesburg" }).success,
    ).toBe(true);
    expect(churchSettingsSchema.safeParse({ ...base, timezone: "Mars/Olympus" }).success).toBe(
      false,
    );
  });
});

describe("serviceTypeSchema", () => {
  it("parses form values", () => {
    const parsed = serviceTypeSchema.parse({
      name: { en: "Prayer", fr: "Prière" },
      dayOfWeek: "5",
      startsAt: "19:00",
    });
    expect(parsed).toEqual({
      name: { en: "Prayer", fr: "Prière" },
      dayOfWeek: 5,
      startsAt: "19:00",
    });
  });

  it("allows services without a fixed day or time", () => {
    const parsed = serviceTypeSchema.parse({
      name: { en: "Special" },
      dayOfWeek: "",
      startsAt: "",
    });
    expect(parsed.dayOfWeek).toBeNull();
    expect(parsed.startsAt).toBeNull();
  });

  it("rejects impossible times", () => {
    expect(serviceTypeSchema.safeParse({ name: { en: "X" }, startsAt: "25:00" }).success).toBe(
      false,
    );
  });
});

describe("categorySchema", () => {
  it("only accepts preset colours", () => {
    expect(categorySchema.safeParse({ name: { en: "Elders" }, color: "#3987e5" }).success).toBe(
      true,
    );
    expect(categorySchema.safeParse({ name: { en: "Elders" }, color: "#ff00ff" }).success).toBe(
      false,
    );
  });
});

describe("reorder", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("moves an item up or down", () => {
    expect(reorder(items, "b", "up").map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(reorder(items, "b", "down").map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("leaves the order alone at the edges", () => {
    expect(reorder(items, "a", "up").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
