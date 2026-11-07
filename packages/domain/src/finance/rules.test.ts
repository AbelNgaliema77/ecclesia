import { describe, expect, it } from "vitest";
import { effectiveGrants, FINANCE_TEAM_GRANTS } from "../access/default-roles";
import { checkAttachment, safeFileName } from "./attachments";
import { returnBatch, submitBatch, verifyBatch } from "./batches";
import { compareBudget } from "./budgets";
import {
  certificateReadiness,
  formatCertificateNumber,
  taxYearEnding,
  taxYearRange,
} from "./certificates";
import { addMonths, lastDayOfMonth, monthsBetween } from "./dates";
import {
  approvalsRequired,
  cancelExpense,
  decideExpense,
  type ExpenseState,
  payExpense,
} from "./expenses";
import { fundCodeSchema } from "./funds";
import { giftInputSchema, givingNumberSchema } from "./giving";
import { canCloseMonth, ensureOpenPeriod } from "./periods";

const FUND = "11111111-1111-4111-8111-111111111111";

describe("gifts", () => {
  it("validates a gift and rejects future dates", () => {
    const schema = giftInputSchema("2026-11-07");
    expect(
      schema.parse({
        fundId: FUND,
        personId: "",
        method: "eft",
        amount: "500",
        receivedOn: "2026-11-01",
      }),
    ).toMatchObject({ amount: 50000, personId: null, reference: null });
    const future = schema.safeParse({
      fundId: FUND,
      method: "cash",
      amount: "5",
      receivedOn: "2026-11-08",
    });
    expect(future.error?.issues[0]?.message).toBe("futureDate");
  });

  it("normalises giving numbers and fund codes", () => {
    expect(givingNumberSchema.parse(" env-042 ")).toBe("ENV-042");
    expect(givingNumberSchema.parse("")).toBeNull();
    expect(givingNumberSchema.safeParse("a b").success).toBe(false);
    expect(fundCodeSchema.parse("tithe")).toBe("TITHE");
    expect(fundCodeSchema.safeParse("x").success).toBe(false);
  });
});

describe("cash batches", () => {
  const submitted = {
    status: "submitted",
    createdBy: "u1",
    submittedBy: "u1",
    lineCount: 3,
  } as const;

  it("needs lines before submitting", () => {
    expect(submitBatch({ ...submitted, status: "draft", lineCount: 0 }).ok).toBe(false);
    expect(submitBatch({ ...submitted, status: "draft" })).toEqual({
      ok: true,
      value: "submitted",
    });
  });

  it("needs a second person to verify or return the count", () => {
    const same = verifyBatch(submitted, "u1");
    expect(same.ok ? null : same.error.code).toBe("finance.batch.sameCounter");
    expect(verifyBatch(submitted, "u2")).toEqual({ ok: true, value: "verified" });
    expect(returnBatch(submitted, "u2")).toEqual({ ok: true, value: "draft" });
    expect(verifyBatch({ ...submitted, status: "verified" }, "u2").ok).toBe(false);
  });
});

describe("expenses", () => {
  const base: ExpenseState = {
    status: "submitted",
    requestedBy: "req",
    amountCents: 500_000,
    approvals: [],
  };

  it("needs a second approver above the limit", () => {
    expect(approvalsRequired(500_000, null)).toBe(1);
    expect(approvalsRequired(500_000, 200_000)).toBe(2);
    expect(approvalsRequired(200_000, 200_000)).toBe(1);
    expect(decideExpense(base, "a1", "approve", 200_000)).toEqual({ ok: true, value: "submitted" });
    const second = { ...base, approvals: [{ approverId: "a1", decision: "approve" as const }] };
    expect(decideExpense(second, "a2", "approve", 200_000)).toEqual({
      ok: true,
      value: "approved",
    });
  });

  it("separates duties", () => {
    const own = decideExpense(base, "req", "approve", null);
    expect(own.ok ? null : own.error.code).toBe("finance.expense.ownRequest");
    const twice = decideExpense(
      { ...base, approvals: [{ approverId: "a1", decision: "approve" }] },
      "a1",
      "approve",
      100,
    );
    expect(twice.ok ? null : twice.error.code).toBe("finance.expense.alreadyDecided");
    expect(decideExpense(base, "a1", "reject", null)).toEqual({ ok: true, value: "rejected" });
    const approved = { ...base, status: "approved" as const };
    expect(payExpense(approved, "req").ok).toBe(false);
    expect(payExpense(approved, "a1")).toEqual({ ok: true, value: "paid" });
    expect(payExpense(base, "a1").ok).toBe(false);
  });

  it("lets only the requester cancel while pending", () => {
    expect(cancelExpense(base, "req")).toEqual({ ok: true, value: "cancelled" });
    expect(cancelExpense(base, "a1").ok).toBe(false);
    expect(cancelExpense({ ...base, status: "approved" }, "req").ok).toBe(false);
  });
});

describe("attachments", () => {
  it("accepts images and PDFs by their bytes", () => {
    expect(checkAttachment(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toEqual({
      ok: true,
      type: "application/pdf",
    });
    expect(checkAttachment(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toEqual({
      ok: false,
      code: "finance.attachment.type",
    });
    expect(checkAttachment(new Uint8Array())).toEqual({
      ok: false,
      code: "finance.attachment.empty",
    });
  });

  it("produces safe file names", () => {
    expect(safeFileName("../../Reçu été 2026.exe", "image/jpeg")).toBe("Recu-ete-2026.jpg");
    expect(safeFileName("???", "application/pdf")).toBe("attachment.pdf");
  });
});

describe("periods and dates", () => {
  it("blocks changes in closed months", () => {
    const closed = new Set(["2026-09-01"]);
    expect(ensureOpenPeriod("2026-09-30", closed).ok).toBe(false);
    expect(ensureOpenPeriod("2026-10-01", closed).ok).toBe(true);
    expect(canCloseMonth("2026-10-01", "2026-11-07").ok).toBe(true);
    expect(canCloseMonth("2026-11-01", "2026-11-07").ok).toBe(false);
  });

  it("walks months", () => {
    expect(addMonths("2026-11-01", 3)).toBe("2027-02-01");
    expect(lastDayOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(monthsBetween("2026-11-15", "2027-01-02")).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
    ]);
  });
});

describe("budgets", () => {
  it("compares budget with actual spending", () => {
    const rows = compareBudget(
      ["a", "b", "c", "d"],
      new Map([
        ["a", 10_000],
        ["b", 10_000],
        ["c", 10_000],
      ]),
      new Map([
        ["a", 5_000],
        ["b", 9_500],
        ["c", 12_000],
        ["d", 100],
      ]),
    );
    expect(rows.map((r) => r.state)).toEqual(["under", "near", "over", "over"]);
    expect(rows[2]?.remainingCents).toBe(-2_000);
    expect(rows[3]?.usedPercent).toBeNull();
  });
});

describe("section 18A certificates", () => {
  it("uses the March to February tax year", () => {
    expect(taxYearEnding("2026-02-28")).toBe(2026);
    expect(taxYearEnding("2026-03-01")).toBe(2027);
    expect(taxYearRange(2028)).toEqual({ from: "2027-03-01", to: "2028-02-29" });
    expect(formatCertificateNumber(2027, 7)).toBe("18A-2027-0007");
  });

  it("lists the church details still missing", () => {
    expect(certificateReadiness({ legalName: "La Borne", pboNumber: null, address: "" })).toEqual({
      ready: false,
      missing: ["pboNumber", "address"],
    });
  });
});

describe("finance team leaders", () => {
  it("receive finance permissions on top of their role", () => {
    const grants = effectiveGrants([{ permission: "payments.request", scope: "team" }], true);
    expect(grants.find((g) => g.permission === "payments.request")?.scope).toBe("church");
    expect(grants).toHaveLength(FINANCE_TEAM_GRANTS.length);
    expect(effectiveGrants([], false)).toEqual([]);
  });
});
