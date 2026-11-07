import Papa from "papaparse";

export type ReadResult =
  | { readonly ok: true; readonly table: string[][] }
  | {
      readonly ok: false;
      readonly code: "import.unreadable" | "import.tooManyRows" | "import.empty";
    };

const MAX_BYTES = 5 * 1024 * 1024;

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  return String(value).trim();
};

const decode = (buffer: ArrayBuffer): string => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
};

const readRows = async (file: File): Promise<unknown[][]> => {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  const parsed = Papa.parse<string[]>(decode(await file.arrayBuffer()).replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
  });
  return parsed.data;
};

export const readTableFile = async (file: File, maxRows: number): Promise<ReadResult> => {
  if (file.size > MAX_BYTES || !/\.(xlsx|csv)$/i.test(file.name)) {
    return { ok: false, code: "import.unreadable" };
  }
  try {
    const table = (await readRows(file)).map((row) => row.map(cellText));
    const lastFilled = table.findLastIndex((row) => row.some((cell) => cell !== ""));
    const trimmed = table.slice(0, lastFilled + 1);
    if (trimmed.length < 2) return { ok: false, code: "import.empty" };
    if (trimmed.length > maxRows + 1) return { ok: false, code: "import.tooManyRows" };
    return { ok: true, table: trimmed };
  } catch {
    return { ok: false, code: "import.unreadable" };
  }
};
