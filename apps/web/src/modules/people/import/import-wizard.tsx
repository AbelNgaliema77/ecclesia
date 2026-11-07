"use client";

import type { ImportColumn, ImportIssue } from "@ecclesia/domain/people";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { commitImportAction, previewImportAction } from "./actions";
import type { ImportPreview, PreviewRow } from "./plan";
import { readImportFile } from "./read-file";

type Loaded = {
  readonly fileName: string;
  readonly table: string[][];
  readonly preview: ImportPreview;
};

const OUTCOME_TONES: Record<PreviewRow["outcome"], BadgeTone> = {
  ready: "brand",
  duplicate: "muted",
  invalid: "gold",
};

export function ImportWizard({ templateHref }: { templateHref: string }) {
  const t = useTranslations("people.import");
  const tf = useTranslations("people.fields");
  const te = useTranslations("errors");
  const router = useRouter();
  const inputId = useId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const message = (code: string) => (te.has(code) ? te(code) : te("generic"));
  const columnLabel = (column: ImportColumn | null) =>
    column === null ? "" : column === "team" ? t("team") : tf(column);
  const issueText = (issue: ImportIssue) =>
    issue.column ? `${columnLabel(issue.column)}: ${message(issue.code)}` : message(issue.code);

  const load = (file: File) => {
    setError(null);
    startTransition(async () => {
      const read = await readImportFile(file);
      if (!read.ok) {
        setLoaded(null);
        setError(message(read.code));
        return;
      }
      const result = await previewImportAction(read.table);
      if (result.status === "error") {
        setLoaded(null);
        setError(message(result.code));
        return;
      }
      if (result.status === "success") {
        setLoaded({ fileName: file.name, table: read.table, preview: result.data });
      }
    });
  };

  const commit = () => {
    if (!loaded) return;
    startTransition(async () => {
      const result = await commitImportAction(loaded.table);
      if (result.status === "error") {
        setError(message(result.code));
        return;
      }
      if (result.status === "success") {
        toast.success(t("done", { count: result.data.imported }));
        router.push("/people");
      }
    });
  };

  const preview = loaded?.preview;
  const rows = preview?.rows.filter((r) => !problemsOnly || r.outcome !== "ready") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5 sm:p-6">
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) load(file);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:bg-muted",
            dragging && "border-brand bg-brand-soft",
            pending && "pointer-events-none opacity-60",
          )}
        >
          <span className="icon-tile size-12">
            <Upload aria-hidden className="size-5" />
          </span>
          <span className="font-semibold">{loaded ? loaded.fileName : t("choose")}</span>
          <span className="text-sm text-ink-faint">{t("chooseHint")}</span>
          <input
            id={inputId}
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) load(file);
              event.target.value = "";
            }}
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <p>{t("columnsHint")}</p>
          <a
            href={templateHref}
            className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
            download
          >
            <FileSpreadsheet aria-hidden className="size-4" />
            {t("template")}
          </a>
        </div>
      </section>

      {error ? <FormAlert tone="error" message={error} /> : null}

      {preview && preview.missing.length > 0 ? (
        <FormAlert
          tone="error"
          message={t("missing", { columns: preview.missing.map((c) => columnLabel(c)).join(", ") })}
        />
      ) : null}

      {preview && preview.missing.length === 0 ? (
        <section className="card overflow-hidden" aria-busy={pending}>
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:px-5">
            <h2 className="mr-auto text-lg font-bold">{t("previewTitle")}</h2>
            <Badge tone="brand">{t("summary.ready", { count: preview.ready })}</Badge>
            <Badge tone="muted">{t("summary.duplicates", { count: preview.duplicates })}</Badge>
            <Badge tone="gold">{t("summary.invalid", { count: preview.invalid })}</Badge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <Switch
              label={t("problemsOnly")}
              checked={problemsOnly}
              onCheckedChange={setProblemsOnly}
            />
            <Button onClick={commit} disabled={pending || preview.ready === 0}>
              {t("submit", { count: preview.ready })}
            </Button>
          </div>
          <div className="max-h-[32rem] overflow-auto border-t border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs font-semibold text-ink-faint">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    {t("row")}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t("person")}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 md:table-cell">
                    {t("team")}
                  </th>
                  <th scope="col" className="px-5 py-3">
                    {t("result")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.row} className="align-top">
                    <td className="px-5 py-3 font-medium text-ink-faint tabular-nums">{row.row}</td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold">{row.name || "–"}</span>
                      <span className="block text-xs text-ink-faint">
                        {[row.email, row.phone].filter(Boolean).join(" · ") || "–"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                      {row.team || "–"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={OUTCOME_TONES[row.outcome]}>
                        {row.outcome === "duplicate"
                          ? t(`outcome.duplicate.${row.duplicateWithin ?? "church"}`)
                          : t(`outcome.${row.outcome}`)}
                      </Badge>
                      {row.issues.length > 0 ? (
                        <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-danger">
                          {row.issues.map((issue) => (
                            <li key={`${issue.column}-${issue.code}`}>{issueText(issue)}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
