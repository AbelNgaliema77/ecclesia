"use client";

import { Check, Copy, MessageCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { createInvitationAction } from "./actions";

type Option = { id: string; label: string };

type InviteDialogProps = {
  churchName: string;
  roles: readonly Option[];
  people: readonly Option[];
  defaultRoleId: string | null;
};

export function InviteDialog(props: InviteDialogProps) {
  const t = useTranslations("settings.members");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        onClick={() => {
          setSession((value) => value + 1);
          setOpen(true);
        }}
      >
        <UserPlus aria-hidden className="size-4" />
        {t("invite")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("inviteTitle", { church: props.churchName })}
        description={t("inviteLead")}
        closeLabel={tc("close")}
      >
        <InviteForm key={session} {...props} close={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function InviteForm({
  churchName,
  roles,
  people,
  defaultRoleId,
  close,
}: InviteDialogProps & { close: () => void }) {
  const t = useTranslations("settings.members");
  const tc = useTranslations("common");
  const to = useTranslations("outbox");
  const format = useFormatter();
  const router = useRouter();
  const [state, action, pending] = useActionState(createInvitationAction, idleState);
  const { fieldError, formError, invalid } = useActionMessages(state);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(t(state.data.delivery === "sent" ? "inviteSent" : "inviteCreated"));
      router.refresh();
    }
  }, [state, t, router]);

  if (state.status === "success") {
    const { link, email, expiresAt, delivery } = state.data;
    const message = t("whatsappMessage", { church: churchName, link });
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="font-bold">{t(`delivery.${delivery}.title`, { email })}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {t(`delivery.${delivery}.lead`)}{" "}
            {t("linkLead", {
              email,
              date: format.dateTime(new Date(expiresAt), { dateStyle: "long" }),
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-control bg-muted p-2 pl-4 ring-1 ring-line ring-inset">
          <code className="min-w-0 flex-1 truncate font-sans text-sm text-ink-soft">{link}</code>
          <Button
            size="sm"
            variant="soft"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              toast.success(t("copied"));
            }}
          >
            {copied ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {t("copy")}
          </Button>
        </div>
        {delivery === "previewed" ? (
          <a
            href="/dev/outbox"
            target="_blank"
            rel="noopener"
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            {to("open")}
          </a>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            {t("done")}
          </Button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary")}
          >
            <MessageCircle aria-hidden className="size-4" />
            {t("whatsapp")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <fieldset disabled={pending} className="flex flex-col gap-5">
        <Field id="invite-email" label={t("email")} error={fieldError("email")}>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            aria-invalid={invalid("email")}
          />
        </Field>
        <Field id="invite-role" label={t("role")} error={fieldError("roleId")}>
          <Select id="invite-role" name="roleId" defaultValue={defaultRoleId ?? undefined} required>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="invite-person" label={t("person")} hint={t("personHint")}>
          <Select id="invite-person" name="personId" defaultValue="">
            <option value="">{t("noPerson")}</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={close} disabled={pending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : t("createInvite")}
        </Button>
      </div>
    </form>
  );
}
