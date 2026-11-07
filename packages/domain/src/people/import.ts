import { type Gender, personInputSchema, type ValidPerson } from "./person";

export const IMPORT_COLUMNS = [
  "firstName",
  "lastName",
  "gender",
  "email",
  "phone",
  "dateOfBirth",
  "joinedYear",
  "team",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const REQUIRED_IMPORT_COLUMNS = [
  "firstName",
  "lastName",
] as const satisfies readonly ImportColumn[];

export const MAX_IMPORT_ROWS = 2000;

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES: Record<ImportColumn, readonly string[]> = {
  firstName: ["firstname", "first", "givenname", "forename", "prenom", "prenoms"],
  lastName: ["lastname", "last", "surname", "familyname", "nom", "nomdefamille"],
  gender: ["gender", "sex", "sexe", "genre"],
  email: ["email", "emailaddress", "mail", "courriel", "adresseemail", "adressecourriel"],
  phone: ["phone", "phonenumber", "mobile", "cell", "cellphone", "telephone", "tel", "portable"],
  dateOfBirth: ["dateofbirth", "birthdate", "birthday", "dob", "datedenaissance", "naissance"],
  joinedYear: ["joined", "yearjoined", "joinedin", "since", "anneedarrivee", "arrivee", "depuis"],
  team: ["team", "equipe", "ministry", "ministere", "departement", "department"],
};

const GENDER_ALIASES: Record<string, Gender> = {
  m: "male",
  male: "male",
  man: "male",
  h: "male",
  homme: "male",
  masculin: "male",
  f: "female",
  female: "female",
  woman: "female",
  femme: "female",
  feminin: "female",
};

export type HeaderMapping = {
  readonly columns: readonly (ImportColumn | null)[];
  readonly missing: readonly ImportColumn[];
};

export const mapHeaders = (headers: readonly string[]): HeaderMapping => {
  const taken = new Set<ImportColumn>();
  const columns = headers.map((header) => {
    const key = fold(header);
    const column = IMPORT_COLUMNS.find(
      (candidate) =>
        !taken.has(candidate) &&
        (fold(candidate) === key || HEADER_ALIASES[candidate].includes(key)),
    );
    if (!column) return null;
    taken.add(column);
    return column;
  });
  return { columns, missing: REQUIRED_IMPORT_COLUMNS.filter((column) => !taken.has(column)) };
};

const pad = (value: string) => value.padStart(2, "0");

export const normalizeImportDate = (value: string): string | null => {
  const text = value.trim();
  if (text === "") return "";
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(text);
  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]]
    : dayFirst
      ? [dayFirst[3], dayFirst[2], dayFirst[1]]
      : [];
  if (!year || !month || !day) return null;
  const result = `${year}-${pad(month)}-${pad(day)}`;
  const parsed = new Date(`${result}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result
    ? null
    : result;
};

const SCHEMA_CODES = new Set([
  "required",
  "invalidPhone",
  "futureDate",
  "invalidYear",
  "futureYear",
]);

const issueCode = (column: ImportColumn | null, message: string) =>
  SCHEMA_CODES.has(message) ? message : column === "email" ? "import.invalidEmail" : "generic";

export type ImportIssue = { readonly column: ImportColumn | null; readonly code: string };

export type ImportCandidate = {
  readonly row: number;
  readonly values: Readonly<Record<ImportColumn, string>>;
  readonly person: ValidPerson | null;
  readonly team: string | null;
  readonly issues: readonly ImportIssue[];
};

const emptyValues = (): Record<ImportColumn, string> =>
  Object.fromEntries(IMPORT_COLUMNS.map((column) => [column, ""])) as Record<ImportColumn, string>;

const isBlank = (cells: readonly string[]) => cells.every((cell) => cell.trim() === "");

export const readImportRow = (
  mapping: HeaderMapping,
  cells: readonly string[],
  row: number,
): ImportCandidate => {
  const values = emptyValues();
  mapping.columns.forEach((column, index) => {
    if (column) values[column] = (cells[index] ?? "").trim();
  });
  const issues: ImportIssue[] = [];

  const gender = values.gender === "" ? null : (GENDER_ALIASES[fold(values.gender)] ?? undefined);
  if (gender === undefined) issues.push({ column: "gender", code: "import.invalidGender" });

  const dateOfBirth = normalizeImportDate(values.dateOfBirth);
  if (dateOfBirth === null) issues.push({ column: "dateOfBirth", code: "import.invalidDate" });

  const parsed = personInputSchema.safeParse({
    firstName: values.firstName,
    lastName: values.lastName,
    gender: gender ?? null,
    email: values.email,
    phone: values.phone,
    dateOfBirth: dateOfBirth || null,
    joinedYear: values.joinedYear,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const column = IMPORT_COLUMNS.find((c) => c === issue.path[0]) ?? null;
      if (column && issues.some((existing) => existing.column === column)) continue;
      issues.push({ column, code: issueCode(column, issue.message) });
    }
  }

  return {
    row,
    values,
    person: parsed.success && issues.length === 0 ? parsed.data : null,
    team: values.team === "" ? null : values.team,
    issues,
  };
};

export type ImportTable = {
  readonly mapping: HeaderMapping;
  readonly candidates: readonly ImportCandidate[];
};

export const readImportTable = (table: readonly (readonly string[])[]): ImportTable => {
  const [headers = [], ...body] = table;
  const mapping = mapHeaders(headers);
  if (mapping.missing.length > 0) return { mapping, candidates: [] };
  const candidates = body.flatMap((cells, index) =>
    isBlank(cells) ? [] : [readImportRow(mapping, cells, index + 2)],
  );
  return { mapping, candidates };
};

export type IdentityRecord = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string | null;
  readonly phone: string | null;
};

export const identityKeys = (person: IdentityRecord): readonly string[] => {
  const keys: string[] = [];
  if (person.email) keys.push(`email:${person.email.toLowerCase()}`);
  if (person.phone) keys.push(`phone:${person.phone.replace(/\D/g, "")}`);
  if (keys.length === 0) keys.push(`name:${fold(person.firstName)}|${fold(person.lastName)}`);
  return keys;
};

export type ImportDecision =
  | { readonly kind: "ready"; readonly candidate: ImportCandidate; readonly person: ValidPerson }
  | {
      readonly kind: "duplicate";
      readonly candidate: ImportCandidate;
      readonly within: "file" | "church";
    }
  | { readonly kind: "invalid"; readonly candidate: ImportCandidate };

export const decideImport = (
  candidates: readonly ImportCandidate[],
  existing: readonly IdentityRecord[],
): readonly ImportDecision[] => {
  const known = new Set(existing.flatMap(identityKeys));
  const seen = new Set<string>();
  const knownNames = new Set(existing.map((p) => `name:${fold(p.firstName)}|${fold(p.lastName)}`));
  return candidates.map((candidate) => {
    if (!candidate.person) return { kind: "invalid", candidate };
    const keys = identityKeys(candidate.person);
    const nameOnly = keys.every((key) => key.startsWith("name:"));
    if (
      keys.some((key) => known.has(key)) ||
      (nameOnly && keys.some((key) => knownNames.has(key)))
    ) {
      return { kind: "duplicate", candidate, within: "church" };
    }
    if (keys.some((key) => seen.has(key))) return { kind: "duplicate", candidate, within: "file" };
    for (const key of keys) seen.add(key);
    return { kind: "ready", candidate, person: candidate.person };
  });
};

export const matchByName = <
  T extends { readonly name: { readonly en: string; readonly fr: string } },
>(
  value: string,
  items: readonly T[],
): T | null => {
  const key = fold(value);
  return items.find((item) => fold(item.name.en) === key || fold(item.name.fr) === key) ?? null;
};
