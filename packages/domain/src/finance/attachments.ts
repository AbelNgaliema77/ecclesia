export const ATTACHMENT_KINDS = ["quote", "receipt", "proofOfPayment"] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const MAX_ATTACHMENTS_PER_EXPENSE = 10;

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

export const sniffAttachmentType = (bytes: Uint8Array): AttachmentType | null => {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
};

export type AttachmentCheck =
  | { readonly ok: true; readonly type: AttachmentType }
  | {
      readonly ok: false;
      readonly code:
        | "finance.attachment.empty"
        | "finance.attachment.tooLarge"
        | "finance.attachment.type";
    };

export const checkAttachment = (bytes: Uint8Array): AttachmentCheck => {
  if (bytes.byteLength === 0) return { ok: false, code: "finance.attachment.empty" };
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES)
    return { ok: false, code: "finance.attachment.tooLarge" };
  const type = sniffAttachmentType(bytes);
  return type ? { ok: true, type } : { ok: false, code: "finance.attachment.type" };
};

export const safeFileName = (name: string, type: AttachmentType): string => {
  const extension = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "application/pdf": "pdf",
  }[type];
  const base = name
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "attachment"}.${extension}`;
};
