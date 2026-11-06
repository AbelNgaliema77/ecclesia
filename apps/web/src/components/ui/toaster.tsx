"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-card !border !border-line !bg-surface !text-ink !shadow-pop !font-sans !text-[0.9375rem]",
          success: "[&_[data-icon]]:!text-accent",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
