"use client";

import { Camera, FileText, Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { prepareUpload } from "./prepare-upload";

export type PickedFile = {
  readonly key: string;
  readonly file: File;
  readonly preview: string | null;
};

let sequence = 0;

export function AttachmentPicker({
  files,
  onChange,
  max,
  disabled = false,
}: {
  files: readonly PickedFile[];
  onChange: (files: PickedFile[]) => void;
  max: number;
  disabled?: boolean;
}) {
  const t = useTranslations("finance.attachments");
  const te = useTranslations("errors");
  const inputId = useId();
  const cameraId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(files);
  latest.current = files;

  useEffect(
    () => () => {
      for (const picked of latest.current) if (picked.preview) URL.revokeObjectURL(picked.preview);
    },
    [],
  );

  const add = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    const next = [...files];
    for (const raw of Array.from(list)) {
      if (next.length >= max) {
        setError(te("finance.attachment.tooMany"));
        break;
      }
      const prepared = await prepareUpload(raw);
      if (!prepared.ok) {
        setError(`${raw.name}: ${te(prepared.code)}`);
        continue;
      }
      next.push({
        key: `file-${++sequence}`,
        file: prepared.file,
        preview: prepared.file.type.startsWith("image/")
          ? URL.createObjectURL(prepared.file)
          : null,
      });
    }
    onChange(next);
    setBusy(false);
  };

  const remove = (key: string) => {
    const target = files.find((f) => f.key === key);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    onChange(files.filter((f) => f.key !== key));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control bg-brand-soft px-4 text-sm font-semibold text-brand-soft-ink hover:brightness-95 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
        >
          <Paperclip aria-hidden className="size-4" />
          {busy ? t("preparing") : t("choose")}
          <input
            id={inputId}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="sr-only"
            disabled={disabled || busy || files.length >= max}
            onChange={async (event) => {
              await add(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label
          htmlFor={cameraId}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control px-4 text-sm font-semibold text-ink-soft hover:bg-muted sm:hidden"
        >
          <Camera aria-hidden className="size-4" />
          {t("camera")}
          <input
            id={cameraId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={disabled || busy || files.length >= max}
            onChange={async (event) => {
              await add(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="text-xs text-ink-faint">{t("hint", { max })}</p>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {files.map((picked) => (
            <li
              key={picked.key}
              className="relative overflow-hidden rounded-card border border-line bg-surface"
            >
              {picked.preview ? (
                <span
                  role="img"
                  aria-label={picked.file.name}
                  className="block aspect-[4/3] bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${picked.preview})` }}
                />
              ) : (
                <span className="flex aspect-[4/3] items-center justify-center bg-muted">
                  <FileText aria-hidden className="size-8 text-ink-faint" />
                </span>
              )}
              <span className="block truncate px-2.5 py-2 text-xs font-medium">
                {picked.file.name}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => remove(picked.key)}
                className="absolute top-1.5 right-1.5 size-8 rounded-full p-0"
                aria-label={t("remove", { name: picked.file.name })}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
