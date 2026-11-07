import type { DateRange, IsoDate } from "./dates";

export const taxYearEnding = (date: IsoDate): number => {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 3 ? year + 1 : year;
};

export const taxYearRange = (yearEnding: number): DateRange => {
  const leap = (yearEnding % 4 === 0 && yearEnding % 100 !== 0) || yearEnding % 400 === 0;
  return { from: `${yearEnding - 1}-03-01`, to: `${yearEnding}-02-${leap ? "29" : "28"}` };
};

export const formatCertificateNumber = (yearEnding: number, sequence: number): string =>
  `18A-${yearEnding}-${String(sequence).padStart(4, "0")}`;

export type CertificateReadiness =
  | { readonly ready: true }
  | { readonly ready: false; readonly missing: readonly ("legalName" | "pboNumber" | "address")[] };

export const certificateReadiness = (settings: {
  readonly legalName: string | null;
  readonly pboNumber: string | null;
  readonly address: string | null;
}): CertificateReadiness => {
  const missing = (["legalName", "pboNumber", "address"] as const).filter((key) => !settings[key]);
  return missing.length === 0 ? { ready: true } : { ready: false, missing };
};
