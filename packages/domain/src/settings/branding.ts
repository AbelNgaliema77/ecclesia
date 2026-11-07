import { z } from "zod";

export const BRAND_THEMES = ["forest", "ocean", "royal", "crimson", "teal", "earth"] as const;

export type BrandTheme = (typeof BRAND_THEMES)[number];

export const DEFAULT_BRAND_THEME: BrandTheme = "forest";

export const brandThemeSchema = z.enum(BRAND_THEMES, "generic");

export const isBrandTheme = (value: unknown): value is BrandTheme =>
  BRAND_THEMES.includes(value as BrandTheme);

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type LogoType = (typeof LOGO_TYPES)[number];

export const MAX_LOGO_BYTES = 512 * 1024;

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

export const sniffLogoType = (bytes: Uint8Array): LogoType | null => {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
};

export type LogoCheck =
  | { readonly ok: true; readonly type: LogoType }
  | {
      readonly ok: false;
      readonly code: "branding.logoTooLarge" | "branding.logoType" | "branding.logoEmpty";
    };

export const checkLogo = (bytes: Uint8Array): LogoCheck => {
  if (bytes.byteLength === 0) return { ok: false, code: "branding.logoEmpty" };
  if (bytes.byteLength > MAX_LOGO_BYTES) return { ok: false, code: "branding.logoTooLarge" };
  const type = sniffLogoType(bytes);
  return type ? { ok: true, type } : { ok: false, code: "branding.logoType" };
};
