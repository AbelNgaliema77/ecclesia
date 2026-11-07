import { describe, expect, it } from "vitest";
import { canTransition, displayName, personInputSchema, transitionStatus } from "./person";

describe("person status", () => {
  it("follows the membership path", () => {
    expect(canTransition("visitor", "regular")).toBe(true);
    expect(canTransition("regular", "member")).toBe(true);
    expect(canTransition("member", "regular")).toBe(true);
  });

  it("does not send members back to visitor", () => {
    const result = transitionStatus("member", "visitor");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("person.invalidStatusTransition");
  });

  it("allows anyone to become inactive and return", () => {
    expect(canTransition("member", "inactive")).toBe(true);
    expect(canTransition("inactive", "member")).toBe(true);
  });
});

describe("personInputSchema", () => {
  it("normalises optional fields", () => {
    const parsed = personInputSchema.parse({
      firstName: "  Grace ",
      lastName: "Mbeki",
      email: "Grace@Example.com",
      phone: "+27 82 123 4567",
      preferredName: "",
    });
    expect(parsed.firstName).toBe("Grace");
    expect(parsed.email).toBe("grace@example.com");
    expect(parsed.phone).toBe("+27821234567");
    expect(parsed.preferredName).toBeNull();
    expect(parsed.status).toBe("visitor");
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
  it("prefers the preferred name", () => {
    expect(displayName({ firstName: "Nomvula", lastName: "Dlamini", preferredName: "Vuvu" })).toBe(
      "Vuvu Dlamini",
    );
  });
});
