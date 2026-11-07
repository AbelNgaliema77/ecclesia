import { describe, expect, it } from "vitest";
import {
  decideImport,
  mapHeaders,
  matchByName,
  normalizeImportDate,
  readImportTable,
} from "./import";

describe("mapHeaders", () => {
  it("recognises English, French and template headers", () => {
    const mapping = mapHeaders(["Prénom", "Nom", "E-mail", "Téléphone", "Équipe", "Unknown"]);
    expect(mapping.columns).toEqual(["firstName", "lastName", "email", "phone", "team", null]);
    expect(mapping.missing).toEqual([]);
    expect(mapHeaders(["firstName", "lastName"]).missing).toEqual([]);
  });

  it("reports missing required columns", () => {
    expect(mapHeaders(["Email"]).missing).toEqual(["firstName", "lastName"]);
  });
});

describe("normalizeImportDate", () => {
  it("accepts ISO and day-first dates", () => {
    expect(normalizeImportDate("2024-3-9")).toBe("2024-03-09");
    expect(normalizeImportDate("09/03/2024")).toBe("2024-03-09");
    expect(normalizeImportDate("2024-03-09T00:00:00.000Z")).toBe("2024-03-09");
    expect(normalizeImportDate("")).toBe("");
  });

  it("rejects impossible or unclear dates", () => {
    expect(normalizeImportDate("31/02/2024")).toBeNull();
    expect(normalizeImportDate("March 9")).toBeNull();
  });
});

describe("readImportTable", () => {
  it("reads values, aliases and issues per row", () => {
    const { candidates } = readImportTable([
      ["First name", "Last name", "Sexe", "Année d’arrivée", "Email", "Date of birth", "Team"],
      ["Ama", "Mensah", "F", "2016", "AMA@example.org", "12/04/1990", "Media"],
      ["", "", "", "", "", "", ""],
      ["Kofi", "", "x", "3000", "not-an-email", "soon", ""],
    ]);
    expect(candidates).toHaveLength(2);
    const [ama, kofi] = candidates;
    expect(ama?.row).toBe(2);
    expect(ama?.person).toMatchObject({
      gender: "female",
      joinedYear: 2016,
      email: "ama@example.org",
    });
    expect(ama?.team).toBe("Media");
    expect(kofi?.row).toBe(4);
    expect(kofi?.person).toBeNull();
    expect(kofi?.issues.map((i) => `${i.column}:${i.code}`).sort()).toEqual([
      "dateOfBirth:import.invalidDate",
      "email:import.invalidEmail",
      "gender:import.invalidGender",
      "joinedYear:futureYear",
      "lastName:required",
    ]);
  });

  it("returns no rows when required headers are missing", () => {
    const table = readImportTable([["Email"], ["a@example.org"]]);
    expect(table.mapping.missing).toEqual(["firstName", "lastName"]);
    expect(table.candidates).toEqual([]);
  });
});

describe("decideImport", () => {
  it("skips duplicates already in the church or earlier in the file", () => {
    const { candidates } = readImportTable([
      ["firstName", "lastName", "email", "phone"],
      ["Ama", "Mensah", "ama@example.org", ""],
      ["Kofi", "Boateng", "", "+27 82 000 1111"],
      ["Esi", "Owusu", "", ""],
      ["Yaw", "Asante", "yaw@example.org", ""],
      ["Yaw", "Asante", "YAW@example.org", ""],
      ["Nana", "", "", ""],
    ]);
    const decisions = decideImport(candidates, [
      { firstName: "Someone", lastName: "Else", email: "ama@example.org", phone: null },
      { firstName: "X", lastName: "Y", email: null, phone: "+27820001111" },
      { firstName: "Esi", lastName: "Owusu", email: "esi@example.org", phone: null },
    ]);
    expect(
      decisions.map((d) => (d.kind === "duplicate" ? `duplicate:${d.within}` : d.kind)),
    ).toEqual([
      "duplicate:church",
      "duplicate:church",
      "duplicate:church",
      "ready",
      "duplicate:file",
      "invalid",
    ]);
  });
});

describe("matchByName", () => {
  it("matches either language ignoring case and accents", () => {
    const teams = [{ id: "a", name: { en: "Media", fr: "Médias" } }];
    expect(matchByName("medias", teams)?.id).toBe("a");
    expect(matchByName(" MEDIA ", teams)?.id).toBe("a");
    expect(matchByName("Ushers", teams)).toBeNull();
  });
});
