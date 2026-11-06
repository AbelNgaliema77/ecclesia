"use client";

import type { ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { ActionDialog } from "./action-dialog";

type ConfirmActionProps<T> = {
  action: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  hidden: Readonly<Record<string, string>>;
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  successMessage: string;
};

export function ConfirmAction<T>(props: ConfirmActionProps<T>) {
  return (
    <ActionDialog
      action={props.action}
      hidden={props.hidden}
      trigger={props.trigger}
      title={props.title}
      description={props.description}
      submitLabel={props.confirmLabel}
      submitVariant="danger"
      successMessage={props.successMessage}
    />
  );
}
