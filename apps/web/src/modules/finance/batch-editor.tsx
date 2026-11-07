"use client";

import { parseAmount } from "@ecclesia/domain/finance";
import { Plus, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { localized } from "@/i18n/config";
import { type ActionState, idleState } from "@/lib/action-state";
import { useHydrated } from "@/lib/use-hydrated";
import { saveBatchAction } from "./batch-actions";
import type { PersonOption } from "./giving-actions";
import { centsToInput, formatMoney } from "./money";
import { PersonCombobox } from "./person-combobox";

type Fund = { id: string; code: string; name: { en: string; fr: string }; isActive: boolean };

type Line = { key: string; fundId: string; person: PersonOption | null; amount: string };

type BatchEditorProps = {
  batchId: string;
  receivedOn: string;
  notes: string | null;
  today: string;
  currency: string;
  funds: readonly Fund[];
  showNames: boolean;
  initialLines: readonly {
    fundId: string;
    personId: string | null;
    personName: string | null;
    amountCents: number;
  }[];
};

let counter = 0;
const nextKey = () => `line-${++counter}`;

export function BatchEditor(props: BatchEditorProps) {
  const t = useTranslations("finance.counts");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const hydrated = useHydrated();
  const formId = useId();
  const activeFunds = props.funds.filter((f) => f.isActive);
  const fallbackFund =
    activeFunds.find((f) => f.code === "OFFERING")?.id ?? activeFunds[0]?.id ?? "";
  const titheFund = activeFunds.find((f) => f.code === "TITHE")?.id ?? fallbackFund;
  const [receivedOn, setReceivedOn] = useState(props.receivedOn);
  const [notes, setNotes] = useState(props.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() =>
    props.initialLines.length > 0
      ? props.initialLines.map((line, index) => ({
          key: `saved-${index}`,
          fundId: line.fundId,
          person: line.personId
            ? { id: line.personId, name: line.personName ?? "", givingNumber: null }
            : null,
          amount: centsToInput(line.amountCents),
        }))
      : [{ key: "saved-0", fundId: fallbackFund, person: null, amount: "" }],
  );
  const [state, setState] = useState<ActionState<null>>(idleState);
  const [pending, startTransition] = useTransition();
  const { formError, fieldError } = useActionMessages(state);

  const parsed = lines.map((line) => ({
    ...line,
    cents: line.amount.trim() === "" ? null : parseAmount(line.amount),
  }));
  const invalidKeys = new Set(
    parsed
      .filter((l) => l.amount.trim() !== "" && (l.cents === null || l.cents === 0))
      .map((l) => l.key),
  );
  const totals = useMemo(() => {
    const byFund = new Map<string, number>();
    for (const line of parsed) {
      if (line.cents) byFund.set(line.fundId, (byFund.get(line.fundId) ?? 0) + line.cents);
    }
    return byFund;
  }, [parsed]);
  const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);

  const update = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const add = (fundId: string) =>
    setLines((current) => [...current, { key: nextKey(), fundId, person: null, amount: "" }]);

  const save = (submit: boolean) => {
    if (invalidKeys.size > 0) {
      setState({ status: "error", code: "finance.invalidAmount" });
      return;
    }
    const payload = {
      receivedOn,
      notes,
      lines: parsed
        .filter((line) => line.amount.trim() !== "")
        .map((line) => ({
          fundId: line.fundId,
          personId: line.person?.id ?? null,
          amount: line.amount,
        })),
    };
    startTransition(async () => {
      const result = await saveBatchAction(props.batchId, payload, submit);
      setState(result);
      if (result.status === "success") {
        toast.success(submit ? t("submitted") : t("saved"));
        router.refresh();
      }
    });
  };

  return (
    <section className="flex flex-col gap-5">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <div className="card grid gap-4 p-5 sm:grid-cols-[12rem_1fr] sm:p-6">
        <Field id={`${formId}-date`} label={t("receivedOn")} error={fieldError("receivedOn")}>
          <Input
            id={`${formId}-date`}
            type="date"
            value={receivedOn}
            max={props.today}
            onChange={(event) => setReceivedOn(event.target.value)}
          />
        </Field>
        <Field id={`${formId}-notes`} label={t("notes")}>
          <Input
            id={`${formId}-notes`}
            value={notes}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>

      <div className="card">
        <div className="hidden grid-cols-[12rem_minmax(0,1fr)_10rem_2.5rem] gap-3 border-b border-line px-5 py-3 text-xs font-semibold text-ink-faint md:grid">
          <span>{t("fund")}</span>
          <span>{props.showNames ? t("envelope") : ""}</span>
          <span className="text-right">{t("amount")}</span>
          <span />
        </div>
        <ol className="divide-y divide-line">
          {lines.map((line, index) => (
            <li
              key={line.key}
              className="grid grid-cols-[minmax(0,1fr)_8.5rem_2.5rem] items-end gap-3 px-4 py-3 md:grid-cols-[12rem_minmax(0,1fr)_10rem_2.5rem] md:items-center md:px-5"
            >
              <div className="col-span-3 md:col-span-1">
                <Select
                  id={`${line.key}-fund`}
                  aria-label={t("lineFund", { line: index + 1 })}
                  value={line.fundId}
                  onChange={(event) => update(line.key, { fundId: event.target.value })}
                >
                  {props.funds.map((fund) => (
                    <option key={fund.id} value={fund.id} disabled={!fund.isActive}>
                      {localized(fund.name, locale)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                {props.showNames ? (
                  <PersonCombobox
                    hideLabel
                    key={`${line.key}-${line.person?.id ?? "none"}`}
                    name={`${line.key}-person`}
                    label={t("lineGiver", { line: index + 1 })}
                    initial={line.person}
                    placeholder={t("loose")}
                    onSelect={(person) =>
                      update(line.key, {
                        person,
                        fundId: person && line.fundId === fallbackFund ? titheFund : line.fundId,
                      })
                    }
                  />
                ) : null}
              </div>
              <div>
                <label htmlFor={`${line.key}-amount`} className="text-sm font-semibold md:sr-only">
                  {t("lineAmount", { line: index + 1 })}
                </label>
                <Input
                  id={`${line.key}-amount`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={line.amount}
                  aria-invalid={invalidKeys.has(line.key) ? true : undefined}
                  className="text-right tabular-nums"
                  onChange={(event) => update(line.key, { amount: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (index === lines.length - 1) add(line.fundId);
                    }
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5 md:mb-0"
                aria-label={t("removeLine", { line: index + 1 })}
                disabled={lines.length === 1}
                onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3 md:px-5">
          <Button variant="soft" size="sm" onClick={() => add(fallbackFund)}>
            <Plus aria-hidden className="size-4" />
            {t("addLoose")}
          </Button>
          {props.showNames ? (
            <Button variant="soft" size="sm" onClick={() => add(titheFund)}>
              <Plus aria-hidden className="size-4" />
              {t("addEnvelope")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-lg font-bold">{t("totals")}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {props.funds
            .filter((fund) => totals.has(fund.id))
            .map((fund) => (
              <li key={fund.id} className="flex justify-between gap-4">
                <span className="text-ink-soft">{localized(fund.name, locale)}</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(format, totals.get(fund.id) ?? 0, props.currency)}
                </span>
              </li>
            ))}
        </ul>
        <p
          className="flex justify-between gap-4 border-t border-line pt-3 text-lg font-bold"
          aria-live="polite"
        >
          <span>{t("grandTotal")}</span>
          <span className="tabular-nums">{formatMoney(format, grandTotal, props.currency)}</span>
        </p>
        <p className="text-sm text-ink-faint">{t("submitHint")}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={pending || !hydrated} onClick={() => save(false)}>
            {t("saveDraft")}
          </Button>
          <Button disabled={pending || !hydrated || grandTotal === 0} onClick={() => save(true)}>
            <Send aria-hidden className="size-4" />
            {t("submit")}
          </Button>
        </div>
      </div>
    </section>
  );
}
