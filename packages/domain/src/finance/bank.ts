import { type IsoDate, isIsoDate } from "./dates";
import { parseSignedAmount } from "./money";

export const MAX_STATEMENT_ROWS = 5000;

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const HEADERS = {
  date: [
    "date",
    "transactiondate",
    "postingdate",
    "postdate",
    "valuedate",
    "datum",
    "dateoperation",
    "dateeffective",
  ],
  description: [
    "description",
    "details",
    "narrative",
    "transactiondescription",
    "reference",
    "transactiondetails",
    "beschrywing",
    "libelle",
    "description1",
  ],
  amount: ["amount", "value", "transactionamount", "bedrag", "montant"],
  credit: ["credit", "creditamount", "moneyin", "deposits", "deposit", "paidin", "credits"],
  debit: ["debit", "debitamount", "moneyout", "withdrawals", "withdrawal", "paidout", "debits"],
} as const;

type HeaderKey = keyof typeof HEADERS;

export type StatementColumns = {
  readonly date: number;
  readonly description: number;
  readonly amount: number | null;
  readonly credit: number | null;
  readonly debit: number | null;
};

const findColumns = (row: readonly string[]): StatementColumns | null => {
  const index = (key: HeaderKey) =>
    row.findIndex((cell) => (HEADERS[key] as readonly string[]).includes(fold(cell)));
  const date = index("date");
  const description = index("description");
  const amount = index("amount");
  const credit = index("credit");
  const debit = index("debit");
  if (date < 0 || description < 0 || (amount < 0 && credit < 0)) return null;
  return {
    date,
    description,
    amount: amount < 0 ? null : amount,
    credit: credit < 0 ? null : credit,
    debit: debit < 0 ? null : debit,
  };
};

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  janv: 1,
  fev: 2,
  fevr: 2,
  mars: 3,
  avr: 4,
  mai: 5,
  juin: 6,
  juil: 7,
  aou: 8,
  aout: 8,
  sept: 9,
  okt: 10,
  des: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

const isoOrNull = (year: number, month: number, day: number): IsoDate | null => {
  const value = `${year}-${pad(month)}-${pad(day)}`;
  return isIsoDate(value) ? value : null;
};

export const parseStatementDate = (input: string): IsoDate | null => {
  const text = input.trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(text);
  if (m) return isoOrNull(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (m) return isoOrNull(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  if (m) return isoOrNull(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[\s-]+([A-Za-zéûÉÛ]{3,5})\.?[\s-]+(\d{4})$/.exec(text);
  if (m) {
    const month = MONTHS[fold(m[2] ?? "")];
    return month ? isoOrNull(Number(m[3]), month, Number(m[1])) : null;
  }
  return null;
};

export type StatementLine = {
  readonly row: number;
  readonly postedOn: IsoDate;
  readonly description: string;
  readonly amountCents: number;
  readonly fingerprint: string;
};

export type StatementRead =
  | { readonly ok: true; readonly credits: readonly StatementLine[]; readonly skipped: number }
  | { readonly ok: false; readonly code: "finance.bank.noHeader" | "finance.bank.noCredits" };

export const readStatement = (table: readonly (readonly string[])[]): StatementRead => {
  const headerIndex = table.slice(0, 30).findIndex((row) => findColumns(row) !== null);
  const header = table[headerIndex];
  const columns = header ? findColumns(header) : null;
  if (headerIndex < 0 || !columns) return { ok: false, code: "finance.bank.noHeader" };

  const seen = new Map<string, number>();
  const credits: StatementLine[] = [];
  let skipped = 0;
  table.slice(headerIndex + 1).forEach((cells, offset) => {
    const postedOn = parseStatementDate(cells[columns.date] ?? "");
    const description = (cells[columns.description] ?? "").trim().replace(/\s+/g, " ");
    const amount =
      columns.credit !== null && (cells[columns.credit] ?? "").trim() !== ""
        ? Math.abs(parseSignedAmount(cells[columns.credit] ?? "") ?? 0)
        : columns.amount !== null
          ? (parseSignedAmount(cells[columns.amount] ?? "") ?? 0)
          : 0;
    if (!postedOn || amount <= 0) {
      if (cells.some((cell) => cell.trim() !== "")) skipped += 1;
      return;
    }
    const base = `${postedOn}|${amount}|${fold(description)}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    credits.push({
      row: headerIndex + offset + 2,
      postedOn,
      description: description.slice(0, 300),
      amountCents: amount,
      fingerprint: `${base}|${occurrence}`,
    });
  });
  if (credits.length === 0) return { ok: false, code: "finance.bank.noCredits" };
  return { ok: true, credits, skipped };
};

export type MatchDonor = { readonly personId: string; readonly givingNumber: string };
export type MatchFund = {
  readonly id: string;
  readonly code: string;
  readonly name: { readonly en: string; readonly fr: string };
};

export type LineMatch = {
  readonly personId: string | null;
  readonly fundId: string | null;
  readonly matchedBy: "givingNumber" | null;
};

const tokens = (text: string) =>
  new Set(
    text
      .toUpperCase()
      .split(/[^A-Z0-9-]+/)
      .flatMap((token) => [token, token.replace(/-/g, "")])
      .filter(Boolean),
  );

export const matchStatementLine = (
  description: string,
  donors: readonly MatchDonor[],
  funds: readonly MatchFund[],
  defaultFundId: string | null,
): LineMatch => {
  const words = tokens(description);
  const folded = fold(description);
  const donor = donors.find(
    (d) =>
      words.has(d.givingNumber.toUpperCase()) ||
      words.has(d.givingNumber.toUpperCase().replace(/-/g, "")),
  );
  const fund =
    funds.find((f) => words.has(f.code)) ??
    funds.find((f) => fold(f.name.en).length >= 4 && folded.includes(fold(f.name.en))) ??
    funds.find((f) => fold(f.name.fr).length >= 4 && folded.includes(fold(f.name.fr)));
  return {
    personId: donor?.personId ?? null,
    fundId: fund?.id ?? defaultFundId,
    matchedBy: donor ? "givingNumber" : null,
  };
};
