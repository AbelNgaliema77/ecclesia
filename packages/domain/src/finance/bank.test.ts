import { describe, expect, it } from "vitest";
import { matchStatementLine, parseStatementDate, readStatement } from "./bank";

describe("parseStatementDate", () => {
  it.each([
    ["2026/11/02", "2026-11-02"],
    ["02/11/2026", "2026-11-02"],
    ["20261102", "2026-11-02"],
    ["2 Nov 2026", "2026-11-02"],
    ["02 nov. 2026", "2026-11-02"],
    ["31/02/2026", null],
    ["yesterday", null],
  ])("reads %s", (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected);
  });
});

describe("readStatement", () => {
  it("finds the header below a bank preamble and keeps credits only", () => {
    const read = readStatement([
      ["Account statement", "", ""],
      ["Account", "62000000000", ""],
      ["Date", "Description", "Amount", "Balance"],
      ["2026/11/02", "ENV-042 TITHE", "500.00", "1500.00"],
      ["2026/11/02", "ELECTRICITY", "-1200.00", "300.00"],
      ["2026/11/03", "ANON  OFFERING", "200,00", "500.00"],
      ["2026/11/03", "ANON  OFFERING", "200,00", "700.00"],
      ["", "", "", ""],
    ]);
    if (!read.ok) throw new Error(read.code);
    expect(read.credits.map((c) => [c.row, c.postedOn, c.amountCents])).toEqual([
      [4, "2026-11-02", 50000],
      [6, "2026-11-03", 20000],
      [7, "2026-11-03", 20000],
    ]);
    expect(read.credits[1]?.fingerprint).not.toBe(read.credits[2]?.fingerprint);
    expect(read.skipped).toBe(1);
  });

  it("supports separate credit and debit columns", () => {
    const read = readStatement([
      ["Transaction date", "Details", "Debit", "Credit"],
      ["05/11/2026", "Deposit 77", "", "1 000,00"],
      ["06/11/2026", "Bank fees", "35,00", ""],
    ]);
    expect(read.ok && read.credits.map((c) => c.amountCents)).toEqual([100000]);
  });

  it("explains files it cannot use", () => {
    expect(readStatement([["foo", "bar"]])).toEqual({ ok: false, code: "finance.bank.noHeader" });
    expect(
      readStatement([
        ["Date", "Description", "Amount"],
        ["2026-11-01", "Fee", "-5"],
      ]),
    ).toEqual({
      ok: false,
      code: "finance.bank.noCredits",
    });
  });
});

describe("matchStatementLine", () => {
  const funds = [
    { id: "tithe", code: "TITHE", name: { en: "Tithe", fr: "Dîme" } },
    {
      id: "building",
      code: "BUILDING",
      name: { en: "Building fund", fr: "Fonds de construction" },
    },
  ];
  const donors = [{ personId: "p42", givingNumber: "ENV-042" }];

  it("matches donors by giving number and funds by code or name", () => {
    expect(
      matchStatementLine("FNB APP PAYMENT ENV042 building fund", donors, funds, "tithe"),
    ).toEqual({
      personId: "p42",
      fundId: "building",
      matchedBy: "givingNumber",
    });
    expect(matchStatementLine("Cash deposit", donors, funds, "tithe")).toEqual({
      personId: null,
      fundId: "tithe",
      matchedBy: null,
    });
    expect(matchStatementLine("ENV-0421", donors, funds, null).personId).toBeNull();
  });
});
