"use client";

import {
  ATTACHMENT_KINDS,
  type AttachmentKind,
  MAX_ATTACHMENTS_PER_EXPENSE,
} from "@ecclesia/domain/finance";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Select } from "@/components/ui/field";
import { AttachmentPicker, type PickedFile } from "./attachment-picker";
import { deleteAttachmentAction, uploadAttachmentAction } from "./expense-actions";

type Attachment = {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  contentType: string;
  byteSize: number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: Date;
};

export function ExpenseAttachments({
  expenseId,
  attachments,
  userId,
  canAdd,
  canDeleteOwn,
  canAddProof,
}: {
  expenseId: string;
  attachments: readonly Attachment[];
  userId: string;
  canAdd: boolean;
  canDeleteOwn: boolean;
  canAddProof: boolean;
}) {
  const t = useTranslations("finance.attachments");
  const te = useTranslations("errors");
  const format = useFormatter();
  const router = useRouter();
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [kind, setKind] = useState<AttachmentKind>("receipt");
  const [pending, startTransition] = useTransition();
  const remaining = MAX_ATTACHMENTS_PER_EXPENSE - attachments.length;
  const kinds = ATTACHMENT_KINDS.filter((k) => k !== "proofOfPayment" || canAddProof);
  const fileUrl = (id: string) => `/finance/expenses/${expenseId}/files/${id}`;

  const upload = () =>
    startTransition(async () => {
      let failed: string | null = null;
      for (const picked of files) {
        const data = new FormData();
        data.set("expenseId", expenseId);
        data.set("kind", kind);
        data.set("file", picked.file);
        const result = await uploadAttachmentAction(data);
        if (result.status === "error")
          failed = te.has(result.code) ? te(result.code) : te("generic");
      }
      if (failed) toast.error(failed);
      else toast.success(t("added", { count: files.length }));
      setFiles([]);
      router.refresh();
    });

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      {attachments.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("none")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex flex-col overflow-hidden rounded-card border border-line"
            >
              <a
                href={fileUrl(attachment.id)}
                target="_blank"
                rel="noopener"
                className="group block bg-muted"
              >
                {attachment.contentType.startsWith("image/") ? (
                  <span
                    role="img"
                    aria-label={attachment.fileName}
                    className="block aspect-[4/3] bg-cover bg-center transition-opacity group-hover:opacity-90"
                    style={{ backgroundImage: `url(${fileUrl(attachment.id)})` }}
                  />
                ) : (
                  <span className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-ink-faint">
                    <FileText aria-hidden className="size-9" />
                    <span className="text-xs font-semibold">PDF</span>
                  </span>
                )}
              </a>
              <div className="flex items-start gap-1 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{t(`kinds.${attachment.kind}`)}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {attachment.uploadedByName ?? "–"} ·{" "}
                    {format.dateTime(attachment.createdAt, { dateStyle: "medium" })}
                  </p>
                </div>
                <a
                  href={`${fileUrl(attachment.id)}?download`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-muted hover:text-ink"
                  aria-label={t("download", { name: attachment.fileName })}
                >
                  <Download aria-hidden className="size-4" />
                </a>
                {canDeleteOwn && attachment.uploadedBy === userId ? (
                  <ConfirmAction
                    action={deleteAttachmentAction}
                    hidden={{ expenseId, attachmentId: attachment.id }}
                    title={t("deleteTitle")}
                    description={t("deleteLead", { name: attachment.fileName })}
                    confirmLabel={t("delete")}
                    successMessage={t("deleted")}
                    trigger={(open) => (
                      <button
                        type="button"
                        onClick={open}
                        className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-danger-soft hover:text-danger"
                        aria-label={t("deleteLabel", { name: attachment.fileName })}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    )}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canAdd && remaining > 0 ? (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field id={`${expenseId}-kind`} label={t("kindLabel")}>
              <Select
                id={`${expenseId}-kind`}
                value={kind}
                onChange={(event) => setKind(event.target.value as AttachmentKind)}
                className="w-52"
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`kinds.${k}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <AttachmentPicker files={files} onChange={setFiles} max={remaining} disabled={pending} />
          {files.length > 0 ? (
            <div className="flex justify-end">
              <Button onClick={upload} disabled={pending}>
                <Upload aria-hidden className="size-4" />
                {t("upload", { count: files.length })}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
