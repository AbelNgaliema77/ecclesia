"use client";

import { MAX_STATEMENT_ROWS } from "@ecclesia/domain/finance";
import { Landmark, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { localized } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { readTableFile } from "@/lib/read-table-file";
import { type BankPreview, commitBankImportAction, previewBankImportAction } from "./bank-actions";
import { formatMoney } from "./money";
import { PersonCombobox } from "./person-combobox";

type Fund = { id: string; name: { en: string; fr: string } };

type Decision = { include: boolean; fundId: string | null; personId: string | null };

type Loaded = {
  readonly fileName: string;
  readonly table: string[][];
  readonly preview: BankPreview;
};

export function BankImportWizard({
  funds,
  currency,
  showNames,
}: {
  funds: readonly Fund[];
  currency: string;
  showNames: boolean;
}) {
  const t = useTranslations("finance.bank");
  const te = useTranslations("errors");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const inputId = useId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const message = (code: string) => (te.has(code) ? te(code) : te("generic"));

  const load = (file: File) => {
    setError(null);
    startTransition(async () => {
      const read = await readTableFile(file, MAX_STATEMENT_ROWS);
      if (!read.ok) {
        setLoaded(null);
        setError(message(read.code));
        return;
      }
      const result = await previewBankImportAction(read.table);
      if (result.status === "error") {
        setLoaded(null);
        setError(message(result.code));
        return;
      }
      if (result.status !== "success") return;
      setLoaded({ fileName: file.name, table: read.table, preview: result.data });
      setDecisions(
        Object.fromEntries(
          result.data.lines.map((line) => [
            line.fingerprint,
            {
              include: !line.duplicate && !line.closed,
              fundId: line.fundId,
              personId: line.personId,
            },
          ]),
        ),
      );
    });
  };

  const fresh = loaded?.preview.lines.filter((line) => !line.duplicate) ?? [];
  const included = fresh.filter((line) => decisions[line.fingerprint]?.include);
  const includedCents = included.reduce((sum, line) => sum + line.amountCents, 0);
  const missingFund = included.some((line) => !decisions[line.fingerprint]?.fundId);

  const update = (fingerprint: string, patch: Partial<Decision>) =>
    setDecisions((current) => {
      const previous = current[fingerprint] ?? { include: true, fundId: null, personId: null };
      return { ...current, [fingerprint]: { ...previous, ...patch } };
    });

  const commit = () => {
    if (!loaded) return;
    startTransition(async () => {
      const result = await commitBankImportAction(loaded.table, {
        fileName: loaded.fileName,
        decisions: fresh.map((line) => ({
          fingerprint: line.fingerprint,
          ...(decisions[line.fingerprint] ?? { include: false, fundId: null, personId: null }),
        })),
      });
      if (result.status === "error") {
        setError(message(result.code));
        return;
      }
      if (result.status === "success") {
        toast.success(t("done", { gifts: result.data.gifts, ignored: result.data.ignored }));
        setLoaded(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5 sm:p-6">
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:bg-muted",
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
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) load(file);
              event.target.value = "";
            }}
          />
        </label>
        <p className="mt-4 text-sm text-ink-soft">{t("matchingHint")}</p>
      </section>

      {error ? <FormAlert tone="error" message={error} /> : null}

      {loaded ? (
        <section className="card" aria-busy={pending}>
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:px-5">
            <h2 className="mr-auto text-lg font-bold">{t("reviewTitle")}</h2>
            <Badge tone="brand">{t("summary.new", { count: fresh.length })}</Badge>
            <Badge tone="muted">
              {t("summary.duplicates", { count: loaded.preview.lines.length - fresh.length })}
            </Badge>
            {loaded.preview.skipped > 0 ? (
              <Badge tone="muted">{t("summary.skipped", { count: loaded.preview.skipped })}</Badge>
            ) : null}
          </div>
          {fresh.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">{t("nothingNew")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {fresh.map((line) => {
                const decision = decisions[line.fingerprint];
                const include = decision?.include ?? false;
                return (
                  <li
                    key={line.fingerprint}
                    className={cn(
                      "grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_14rem_16rem] lg:items-center",
                      !include && "opacity-60",
                    )}
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={include}
                        disabled={line.closed}
                        onChange={(event) =>
                          update(line.fingerprint, { include: event.target.checked })
                        }
                        className="size-4 accent-[var(--brand)]"
                        aria-label={t("includeLine", { description: line.description })}
                      />
                      <span className="w-28 font-semibold tabular-nums">
                        {formatMoney(format, line.amountCents, currency)}
                      </span>
                    </label>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{line.description || "–"}</p>
                      <p className="text-xs text-ink-faint">
                        {format.dateTime(new Date(`${line.postedOn}T12:00:00Z`), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })}
                        {line.closed ? ` · ${t("closedMonth")}` : ""}
                        {line.personId
                          ? ` · ${t("matched", { number: line.givingNumber ?? "" })}`
                          : ""}
                      </p>
                    </div>
                    <Select
                      aria-label={t("fundFor", { description: line.description })}
                      value={decision?.fundId ?? ""}
                      disabled={!include}
                      onChange={(event) =>
                        update(line.fingerprint, { fundId: event.target.value || null })
                      }
                    >
                      <option value="">{t("chooseFund")}</option>
                      {funds.map((fund) => (
                        <option key={fund.id} value={fund.id}>
                          {localized(fund.name, locale)}
                        </option>
                      ))}
                    </Select>
                    {showNames ? (
                      <PersonCombobox
                        hideLabel
                        name={`${line.fingerprint}-person`}
                        label={t("giverFor", { description: line.description })}
                        initial={
                          line.personId && line.personName
                            ? {
                                id: line.personId,
                                name: line.personName,
                                givingNumber: line.givingNumber,
                              }
                            : null
                        }
                        onSelect={(person) =>
                          update(line.fingerprint, { personId: person?.id ?? null })
                        }
                      />
                    ) : (
                      <span />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 sm:px-5">
            <p className="text-sm text-ink-soft">
              {t("selected", {
                count: included.length,
                amount: formatMoney(format, includedCents, currency),
              })}
            </p>
            <Button onClick={commit} disabled={pending || fresh.length === 0 || missingFund}>
              <Landmark aria-hidden className="size-4" />
              {t("submit", { count: included.length })}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
