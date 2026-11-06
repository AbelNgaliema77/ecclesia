"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { type ActionState, idleState } from "@/lib/action-state";
import { Button, type ButtonVariant } from "./button";
import { Dialog } from "./dialog";
import { FormAlert } from "./form-alert";

type FieldHelpers = {
  fieldError: (name: string) => string | undefined;
  invalid: (name: string) => true | undefined;
};

type ActionDialogProps<T> = {
  action: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  trigger: (open: () => void) => ReactNode;
  title: string;
  description?: string;
  submitLabel: string;
  successMessage: string;
  submitVariant?: ButtonVariant;
  size?: "md" | "lg";
  hidden?: Readonly<Record<string, string>>;
  onSuccess?: (data: T) => void;
  children?: (helpers: FieldHelpers) => ReactNode;
};

export function ActionDialog<T>(props: ActionDialogProps<T>) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      {props.trigger(() => {
        setSession((value) => value + 1);
        setOpen(true);
      })}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={props.title}
        {...(props.description ? { description: props.description } : {})}
        size={props.size ?? "md"}
        closeLabel={tc("close")}
      >
        <DialogForm key={session} {...props} close={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function DialogForm<T>({
  action,
  submitLabel,
  successMessage,
  submitVariant = "primary",
  hidden,
  onSuccess,
  children,
  close,
}: ActionDialogProps<T> & { close: () => void }) {
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState<T>, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "success") {
        toast.success(successMessage);
        onSuccess?.(result.data);
      }
      return result;
    },
    idleState,
  );
  const { fieldError, formError, invalid } = useActionMessages(state);

  useEffect(() => {
    if (state.status !== "success") return;
    close();
    router.refresh();
  }, [state, close, router]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      {children ? (
        <fieldset disabled={pending} className="flex flex-col gap-5">
          {children({ fieldError, invalid })}
        </fieldset>
      ) : null}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={close} disabled={pending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" variant={submitVariant} disabled={pending}>
          {pending ? tc("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
