"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { idleState } from "@/lib/action-state";
import { saveHeadcountAction } from "../actions";
import {
  clearQueuedHeadcount,
  headcountFormData,
  isNetworkFailure,
  QUEUE_EVENT,
  queuedHeadcounts,
} from "./queue";

export function OfflineSync({ churchId }: { churchId: string }) {
  const t = useTranslations("attendance.offline");
  const router = useRouter();
  const [waiting, setWaiting] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);

  const sync = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    const pending = queuedHeadcounts(churchId);
    if (pending.length === 0) return;
    running.current = true;
    setSyncing(true);
    let synced = 0;
    try {
      for (const entry of pending) {
        try {
          const result = await saveHeadcountAction(
            idleState,
            headcountFormData(entry.serviceId, entry.counts),
          );
          if (result.status === "success") {
            synced += 1;
            clearQueuedHeadcount(churchId, entry.serviceId, entry.savedAt);
          } else if (result.status === "error" && result.code !== "unexpected") {
            clearQueuedHeadcount(churchId, entry.serviceId, entry.savedAt);
            toast.error(t("rejected"));
          }
        } catch (error) {
          if (isNetworkFailure(error)) break;
          throw error;
        }
      }
    } finally {
      running.current = false;
      setSyncing(false);
    }
    if (synced > 0) {
      toast.success(t("synced", { count: synced }));
      router.refresh();
    }
  }, [churchId, router, t]);

  useEffect(() => {
    const update = () => setWaiting(queuedHeadcounts(churchId).length);
    update();
    void sync();
    const online = () => void sync();
    window.addEventListener(QUEUE_EVENT, update);
    window.addEventListener("storage", update);
    window.addEventListener("online", online);
    const timer = window.setInterval(online, 60_000);
    return () => {
      window.removeEventListener(QUEUE_EVENT, update);
      window.removeEventListener("storage", update);
      window.removeEventListener("online", online);
      window.clearInterval(timer);
    };
  }, [churchId, sync]);

  if (waiting === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <div
        role="status"
        className="mt-2 flex items-center gap-3 rounded-control bg-gold-soft px-4 py-2.5 text-sm font-medium text-gold-ink"
      >
        <CloudOff aria-hidden className="size-4 shrink-0" />
        <span className="flex-1">{t("waiting", { count: waiting })}</span>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline disabled:opacity-60"
        >
          <RefreshCw aria-hidden className={syncing ? "size-4 animate-spin" : "size-4"} />
          {t("retry")}
        </button>
      </div>
    </div>
  );
}
