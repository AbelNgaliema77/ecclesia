import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { localeFromAcceptLanguage, localized } from "./config";

const keysOf = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, child]) =>
        keysOf(child, prefix ? `${prefix}.${key}` : key),
      )
    : [prefix];

describe("translations", () => {
  it("has the same keys in English and French", () => {
    expect(keysOf(fr).sort()).toEqual(keysOf(en).sort());
  });
});

describe("localeFromAcceptLanguage", () => {
  it("picks French for French browsers", () => {
    expect(localeFromAcceptLanguage("fr-CD,fr;q=0.9,en;q=0.8")).toBe("fr");
  });

  it("falls back to English", () => {
    expect(localeFromAcceptLanguage("zu-ZA")).toBe("en");
    expect(localeFromAcceptLanguage(null)).toBe("en");
  });
});

describe("localized", () => {
  it("falls back to English when the French text is empty", () => {
    expect(localized({ en: "Men", fr: "" }, "fr")).toBe("Men");
    expect(localized({ en: "Men", fr: "Hommes" }, "fr")).toBe("Hommes");
  });
});
