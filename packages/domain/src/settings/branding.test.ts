import { describe, expect, it } from "vitest";
import { checkLogo, isBrandTheme, MAX_LOGO_BYTES, sniffLogoType } from "./branding";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("branding", () => {
  it("recognises the built-in themes only", () => {
    expect(isBrandTheme("ocean")).toBe(true);
    expect(isBrandTheme("#ff0000")).toBe(false);
  });

  it("detects logo types from their bytes, not their names", () => {
    expect(sniffLogoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(
      "image/png",
    );
    expect(sniffLogoType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffLogoType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe(
      "image/webp",
    );
    expect(sniffLogoType(bytes(0x3c, 0x73, 0x76, 0x67, 0x20))).toBeNull();
  });

  it("rejects empty, oversized and unknown files", () => {
    expect(checkLogo(new Uint8Array())).toEqual({ ok: false, code: "branding.logoEmpty" });
    const big = new Uint8Array(MAX_LOGO_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(checkLogo(big)).toEqual({ ok: false, code: "branding.logoTooLarge" });
    expect(checkLogo(bytes(1, 2, 3))).toEqual({ ok: false, code: "branding.logoType" });
    expect(checkLogo(bytes(0xff, 0xd8, 0xff, 0xdb))).toEqual({ ok: true, type: "image/jpeg" });
  });
});
