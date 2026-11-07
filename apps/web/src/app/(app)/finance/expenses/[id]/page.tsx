import { approvalsRequired, formatExpenseNumber } from "@ecclesia/domain/finance";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { localized } from "@/i18n/config";
import { ExpenseAttachments } from "@/modules/finance/expense-attachments";
import { CancelExpenseButton, DecideButtons, PayDialog } from "@/modules/finance/expense-decisions";
import { ExpenseStatusBadge } from "@/modules/finance/expense-status";
import { formatMoney, Money } from "@/modules/finance/money";
import { loadExpense } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Payment request" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ExpensePage({ params }: PageProps) {
  const { id } = await params;
  const [data, t, format, locale] = await Promise.all([
    loadExpense(id),
    getTranslations("finance.expenses"),
    getFormatter(),
    getLocale(),
  ]);
  const { expense } = data;
  const summary = `${formatExpenseNumber(expense.number)} · ${expense.title} · ${formatMoney(format, expense.amountCents, data.currency)}`;
  const required = approvalsRequired(expense.amountCents, data.secondApprovalAboveCents);
  const approvals = expense.approvals.filter((a) => a.decision === "approve").length;
  const isRequester = expense.requestedBy === data.userId;
  const alreadyDecided = expense.approvals.some((a) => a.approverId === data.userId);
  const canDecide =
    data.canWrite &&
    data.canApprove &&
    expense.status === "submitted" &&
    !isRequester &&
    !alreadyDecided;
  const canPay = data.canWrite && data.canApprove && expense.status === "approved" && !isRequester;
  const date = (value: Date) => format.dateTime(value, { dateStyle: "medium", timeStyle: "short" });
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  const details: [string, string][] = [
    [t("fields.payee"), expense.payee],
    [t("fields.category"), localized(expense.categoryName, locale)],
    [t("fields.fund"), localized(expense.fundName, locale)],
    ...(expense.teamName
      ? ([[t("fields.team"), localized(expense.teamName, locale)]] as [string, string][])
      : []),
    ...(expense.neededBy
      ? ([[t("fields.neededBy"), day(expense.neededBy)]] as [string, string][])
      : []),
    [
      t("requested"),
      t("requestedBy", { name: expense.requestedByName ?? "–", date: date(expense.createdAt) }),
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/finance/expenses" label={t("back")} />
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-faint">
            {formatExpenseNumber(expense.number)}
          </p>
          <h1 className="text-[2rem] leading-tight font-bold">{expense.title}</h1>
        </div>
        <ExpenseStatusBadge status={expense.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <section className="card p-5 sm:p-6">
            <Money
              cents={expense.amountCents}
              currency={data.currency}
              className="font-display text-[2.25rem] font-bold"
            />
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
              {details.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="font-semibold text-ink-faint">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {expense.description ? (
              <p className="mt-5 border-t border-line pt-4 text-sm whitespace-pre-line text-ink-soft">
                {expense.description}
              </p>
            ) : null}
          </section>
          <ExpenseAttachments
            expenseId={expense.id}
            attachments={expense.attachments}
            userId={data.userId}
            canAdd={
              data.canWrite &&
              (expense.status === "submitted" ||
                expense.status === "approved" ||
                expense.status === "paid")
            }
            canDeleteOwn={
              data.canWrite && (expense.status === "submitted" || expense.status === "approved")
            }
            canAddProof={data.canApprove}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card flex flex-col gap-4 p-5">
            <h2 className="text-lg font-bold">{t("progress")}</h2>
            <ol className="flex flex-col gap-3 text-sm">
              <li className="flex gap-3">
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-soft-ink" />
                <span>
                  {t("timeline.requested", {
                    name: expense.requestedByName ?? "–",
                    date: date(expense.createdAt),
                  })}
                </span>
              </li>
              {expense.approvals.map((approval) => (
                <li
                  key={`${approval.approverId}-${approval.createdAt.toISOString()}`}
                  className="flex gap-3"
                >
                  {approval.decision === "approve" ? (
                    <CheckCircle2
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-brand-soft-ink"
                    />
                  ) : (
                    <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
                  )}
                  <span>
                    {t(`timeline.${approval.decision}`, {
                      name: approval.approverName ?? "–",
                      date: date(approval.createdAt),
                    })}
                    {approval.note ? (
                      <span className="mt-0.5 block text-ink-faint">“{approval.note}”</span>
                    ) : null}
                  </span>
                </li>
              ))}
              {expense.status === "submitted" ? (
                <li className="flex gap-3 text-ink-faint">
                  <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>{t("timeline.waiting", { given: approvals, required })}</span>
                </li>
              ) : null}
              {expense.status === "paid" && expense.paidOn ? (
                <li className="flex gap-3">
                  <CheckCircle2
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-brand-soft-ink"
                  />
                  <span>
                    {t("timeline.paid", {
                      name: expense.paidByName ?? "–",
                      date: day(expense.paidOn),
                    })}
                    {expense.paymentReference ? (
                      <span className="mt-0.5 block text-ink-faint">
                        {t("referenceValue", { reference: expense.paymentReference })}
                      </span>
                    ) : null}
                  </span>
                </li>
              ) : null}
              {expense.status === "cancelled" ? (
                <li className="flex gap-3 text-ink-faint">
                  <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>{t("timeline.cancelled")}</span>
                </li>
              ) : null}
            </ol>
            {canDecide ? <DecideButtons id={expense.id} summary={summary} /> : null}
            {expense.status === "submitted" && isRequester && data.canApprove ? (
              <p className="rounded-control bg-muted px-3 py-2.5 text-sm text-ink-soft">
                {t("ownRequest")}
              </p>
            ) : null}
            {canPay ? <PayDialog id={expense.id} summary={summary} today={data.today} /> : null}
            {expense.status === "approved" && isRequester && data.canApprove ? (
              <p className="rounded-control bg-muted px-3 py-2.5 text-sm text-ink-soft">
                {t("ownPayment")}
              </p>
            ) : null}
            {data.canWrite && isRequester && expense.status === "submitted" ? (
              <CancelExpenseButton id={expense.id} />
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
