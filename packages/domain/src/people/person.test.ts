import { describe, expect, it } from "vitest";
import { displayName, personInputSchema } from "./person";

describe("personInputSchema", () => {
  it("normalises optional fields", () => {
    const parsed = personInputSchema.parse({
      firstName: "  Grace ",
      lastName: "Mbeki",
      email: "Grace@Example.com",
      phone: "+27 82 123 4567",
      joinedYear: "",
    });
    expect(parsed.firstName).toBe("Grace");
    expect(parsed.email).toBe("grace@example.com");
    expect(parsed.phone).toBe("+27821234567");
    expect(parsed.joinedYear).toBeNull();
  });

  it("reads the year they joined", () => {
    expect(
      personInputSchema.parse({ firstName: "A", lastName: "B", joinedYear: "2014" }).joinedYear,
    ).toBe(2014);
    expect(personInputSchema.parse({ firstName: "A", lastName: "B" }).joinedYear).toBeNull();
  });

  it("rejects joined years in the future or out of range", () => {
    const next = new Date().getUTCFullYear() + 1;
    for (const joinedYear of [String(next), "1850", "20.5", "abc"]) {
      expect(
        personInputSchema.safeParse({ firstName: "A", lastName: "B", joinedYear }).success,
      ).toBe(false);
    }
  });

  it("rejects missing names and bad phone numbers", () => {
    const result = personInputSchema.safeParse({ firstName: "", lastName: "X", phone: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects future dates of birth", () => {
    const future = new Date(Date.now() + 86_400_000 * 30);
    const result = personInputSchema.safeParse({
      firstName: "A",
      lastName: "B",
      dateOfBirth: future,
    });
    expect(result.success).toBe(false);
  });
});

describe("displayName", () => {
  it("joins first and last name", () => {
    expect(displayName({ firstName: "Nomvula", lastName: "Dlamini" })).toBe("Nomvula Dlamini");
  });
});
