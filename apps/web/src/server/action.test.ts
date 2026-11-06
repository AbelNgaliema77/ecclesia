import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./context", () => ({ getChurchContext: vi.fn() }));
vi.mock("./db", () => ({ db: {} }));

const { formToNested, formToObject } = await import("./action");

describe("form helpers", () => {
  it("nests dotted field names", () => {
    const form = new FormData();
    form.set("name.en", "Media");
    form.set("name.fr", "Médias");
    form.set("color", "#3987e5");
    form.set("$ACTION_ID_abc", "");
    expect(formToNested(form)).toEqual({ name: { en: "Media", fr: "Médias" }, color: "#3987e5" });
  });

  it("keeps flat objects flat", () => {
    const form = new FormData();
    form.set("firstName", "Grace");
    expect(formToObject(form)).toEqual({ firstName: "Grace" });
  });
});
