import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps internal paths", () => {
    expect(safeNext("/invite/abc")).toBe("/invite/abc");
  });

  it("refuses external and protocol-relative redirects", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});
