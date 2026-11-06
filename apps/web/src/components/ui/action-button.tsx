"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { type ActionState, idleState } from "@/lib/action-state";
import { Button, type ButtonVariant } from "./button";

type ActionButtonProps<T> = {
  action: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  hidden: Readonly<Record<string, string>>;
  successMessage: string;
  variant?: ButtonVariant;
  label?: string;
  children: ReactNode;
};

export function ActionButton<T>({
  action,
  hidden,
  successMessage,
  variant = "ghost",
  label,
  children,
}: ActionButtonProps<T>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState<T>, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "success") toast.success(successMessage);
      return result;
    },
    idleState,
  );
  const { formError } = useActionMessages(state);

  useEffect(() => {
    if (state.status === "success") router.refresh();
    else if (state.status === "error" && formError) toast.error(formError);
  }, [state, formError, router]);

  return (
    <form action={formAction}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" size="sm" variant={variant} disabled={pending} aria-label={label}>
        {children}
      </Button>
    </form>
  );
}
