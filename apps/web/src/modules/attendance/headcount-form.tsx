"use client";

import { MAX_HEADCOUNT } from "@ecclesia/domain/attendance";
import { CloudOff, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { type ActionState, idleState } from "@/lib/action-state";
import { useHydrated } from "@/lib/use-hydrated";
import { saveHeadcountAction } from "./actions";
import {
  clearQueuedHeadcount,
  headcountFormData,
  isNetworkFailure,
  QUEUE_EVENT,
  queuedHeadcount,
  queueHeadcount,
} from "./offline/queue";

type HeadcountFormProps = {
  churchId: string;
  serviceId: string;
  categories: readonly { id: string; label: string; color: string }[];
  initial: Readonly<Record<string, number>>;
  disabled: boolean;
};

const clamp = (value: number) => Math.min(MAX_HEADCOUNT, Math.max(0, Math.trunc(value)));

export function HeadcountForm({
  churchId,
  serviceId,
  categories,
  initial,
  disabled,
}: HeadcountFormProps) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, initial[c.id] ?? 0])),
  );
  const [bump, setBump] = useState<Record<string, number>>({});
  const [state, setState] = useState<ActionState<{ total: number }>>(idleState);
  const [queued, setQueued] = useState(false);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const { formError } = useActionMessages(state);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  useEffect(() => {
    const restore = () => {
      const entry = queuedHeadcount(churchId, serviceId);
      setQueued(entry !== null);
      return entry;
    };
    const entry = restore();
    if (entry) setCounts((current) => ({ ...current, ...entry.counts }));
    window.addEventListener(QUEUE_EVENT, restore);
    return () => window.removeEventListener(QUEUE_EVENT, restore);
  }, [churchId, serviceId]);

  const keepOnDevice = () => {
    if (queueHeadcount({ churchId, serviceId, counts })) {
      setState(idleState);
      toast.info(t("offline.queued"));
    } else {
      setState({ status: "error", code: "unexpected" });
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!navigator.onLine) {
      keepOnDevice();
      return;
    }
    startTransition(async () => {
      try {
        const result = await saveHeadcountAction(idleState, headcountFormData(serviceId, counts));
        setState(result);
        if (result.status === "success") {
          clearQueuedHeadcount(churchId, serviceId);
          toast.success(t("saved"));
          router.refresh();
        }
      } catch (error) {
        if (!isNetworkFailure(error)) throw error;
        keepOnDevice();
      }
    });
  };

  const change = (id: string, next: number) =>
    setCounts((current) => ({ ...current, [id]: clamp(next) }));

  const step = (id: string, next: number) => {
    change(id, next);
    setBump((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    if ("vibrate" in navigator) navigator.vibrate(8);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      {queued ? (
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-control bg-gold-soft px-4 py-3 text-sm font-medium text-gold-ink"
        >
          <CloudOff aria-hidden className="size-4 shrink-0" />
          {t("offline.onDevice")}
        </p>
      ) : null}

      <fieldset disabled={disabled || pending || !hydrated} className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => {
          const value = counts[category.id] ?? 0;
          return (
            <div key={category.id} className="card flex items-center gap-3 p-3 pl-4">
              <span
                aria-hidden
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ background: category.color }}
              />
              <label htmlFor={`count-${category.id}`} className="min-w-0 flex-1 font-semibold">
                {category.label}
              </label>
              <button
                type="button"
                onClick={() => step(category.id, value - 1)}
                disabled={value === 0}
                aria-label={t("decrease", { category: category.label })}
                className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-ink-soft transition-transform active:scale-90 disabled:opacity-40"
              >
                <Minus aria-hidden className="size-5" />
              </button>
              <input
                key={bump[category.id] ?? 0}
                id={`count-${category.id}`}
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(value)}
                onChange={(e) =>
                  change(category.id, Number(e.target.value.replace(/\D/g, "") || 0))
                }
                onFocus={(e) => e.target.select()}
                className="count-pop h-12 w-16 rounded-control bg-transparent text-center font-display text-[1.75rem] font-bold focus:bg-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => step(category.id, value + 1)}
                aria-label={t("increase", { category: category.label })}
                className="inline-flex size-12 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[0_6px_16px_-6px_rgb(15_107_71/0.6)] transition-transform active:scale-90"
              >
                <Plus aria-hidden className="size-5" />
              </button>
            </div>
          );
        })}
      </fieldset>

      <div className="sticky bottom-28 z-10 lg:bottom-4">
        <div className="hero flex items-center justify-between gap-4 rounded-hero p-3 pl-6 shadow-pop">
          <p className="flex items-baseline gap-2.5">
            <span className="text-sm font-semibold text-hero-ink-soft">{t("total")}</span>
            <span
              key={total}
              className="count-pop font-display text-4xl font-bold"
              aria-live="polite"
            >
              {format.number(total)}
            </span>
          </p>
          {disabled ? null : (
            <Button
              type="submit"
              size="lg"
              disabled={pending || !hydrated}
              className="bg-white text-[#0a3d2b] shadow-none hover:bg-white/90"
            >
              {pending ? tc("saving") : t("save")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
