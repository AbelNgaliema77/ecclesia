import { describe, expect, it } from "vitest";
import { amountSchema, centsToDecimal, parseAmount, parseSignedAmount } from "./money";

describe("parseAmount", () => {
  it.each([
    ["100", 10000],
    ["1 234,50", 123450],
    ["1,234.50", 123450],
    ["1.234,50", 123450],
    ["R 1 234.5", 123450],
    ["1,234", 123400],
    ["1.234.567", 123456700],
    ["12,5", 1250],
    ["0.99", 99],
    ["ZAR 50", 5000],
    ["$20.00", 2000],
    [42.5, 4250],
  ])("reads %s", (input, cents) => {
    expect(parseAmount(input)).toBe(cents);
  });

  it.each(["", "abc", "1.2.3,456,7", "--5", "1,23,4", ",5,5"])("rejects %s", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("treats a three-digit tail as thousands", () => {
    expect(parseAmount("1.234")).toBe(123400);
  });

  it("reads negatives used by bank statements", () => {
    expect(parseSignedAmount("-250.00")).toBe(-25000);
    expect(parseSignedAmount("(250.00)")).toBe(-25000);
    expect(parseSignedAmount("250.00-")).toBe(-25000);
    expect(parseAmount("-1")).toBeNull();
  });
});

describe("amountSchema", () => {
  it("requires a positive amount within limits", () => {
    expect(amountSchema.parse("150,00")).toBe(15000);
    expect(amountSchema.safeParse("0").error?.issues[0]?.message).toBe("finance.invalidAmount");
    expect(amountSchema.safeParse("99999999999").error?.issues[0]?.message).toBe(
      "finance.amountTooLarge",
    );
  });

  it("formats cents for exports", () => {
    expect(centsToDecimal(123405)).toBe("1234.05");
    expect(centsToDecimal(-5)).toBe("-0.05");
  });
});
