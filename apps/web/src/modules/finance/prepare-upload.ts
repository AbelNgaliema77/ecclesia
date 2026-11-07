import { MAX_ATTACHMENT_BYTES } from "@ecclesia/domain/finance";

export type PreparedUpload =
  | { readonly ok: true; readonly file: File }
  | {
      readonly ok: false;
      readonly code:
        | "finance.attachment.type"
        | "finance.attachment.tooLarge"
        | "finance.attachment.empty";
    };

const MAX_DIMENSION = 2000;
const COMPRESS_ABOVE_BYTES = 1_500_000;
const PASSTHROUGH_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const renameAsJpeg = (name: string) => `${name.replace(/\.[^.]*$/, "") || "photo"}.jpg`;

const compress = async (file: File): Promise<File | null> => {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  return blob ? new File([blob], renameAsJpeg(file.name), { type: "image/jpeg" }) : null;
};

export const prepareUpload = async (file: File): Promise<PreparedUpload> => {
  if (file.size === 0) return { ok: false, code: "finance.attachment.empty" };
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return file.size > MAX_ATTACHMENT_BYTES
      ? { ok: false, code: "finance.attachment.tooLarge" }
      : { ok: true, file };
  }
  if (PASSTHROUGH_TYPES.has(file.type) && file.size <= COMPRESS_ABOVE_BYTES)
    return { ok: true, file };
  const compressed = await compress(file);
  if (!compressed) {
    return PASSTHROUGH_TYPES.has(file.type) && file.size <= MAX_ATTACHMENT_BYTES
      ? { ok: true, file }
      : { ok: false, code: "finance.attachment.type" };
  }
  const best = PASSTHROUGH_TYPES.has(file.type) && file.size < compressed.size ? file : compressed;
  return best.size > MAX_ATTACHMENT_BYTES
    ? { ok: false, code: "finance.attachment.tooLarge" }
    : { ok: true, file: best };
};
