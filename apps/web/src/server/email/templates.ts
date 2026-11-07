import { createTranslator } from "next-intl";
import type { Locale } from "@/i18n/config";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const MESSAGES = { en, fr } as const;

const translator = (locale: Locale, timeZone = "UTC") =>
  createTranslator({ locale, messages: MESSAGES[locale], namespace: "email", timeZone });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type Layout = {
  readonly locale: Locale;
  readonly preheader: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly action: { readonly label: string; readonly url: string };
  readonly footnote: string;
};

const BRAND = "#0f6b47";

const render = (layout: Layout) => {
  const t = translator(layout.locale);
  const paragraphs = layout.paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#33413b">${escapeHtml(text)}</p>`,
    )
    .join("");
  const html = `<!doctype html>
<html lang="${layout.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(layout.heading)}</title></head>
<body style="margin:0;padding:0;background:#f2f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(layout.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f4;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #dde7e2">
<tr><td style="padding:28px 32px 0;font-size:18px;font-weight:700;color:${BRAND}">Ecclesia</td></tr>
<tr><td style="padding:20px 32px 8px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0c1713">${escapeHtml(layout.heading)}</h1>
${paragraphs}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:${BRAND}">
<a href="${escapeHtml(layout.action.url)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(layout.action.label)}</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5d6b65">${escapeHtml(t("linkFallback"))}</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all"><a href="${escapeHtml(layout.action.url)}" style="color:${BRAND}">${escapeHtml(layout.action.url)}</a></p>
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #dde7e2;font-size:13px;line-height:1.5;color:#5d6b65">${escapeHtml(layout.footnote)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  const text = [
    layout.heading,
    "",
    ...layout.paragraphs.flatMap((p) => [p, ""]),
    `${layout.action.label}: ${layout.action.url}`,
    "",
    layout.footnote,
  ].join("\n");
  return { html, text };
};

export type InvitationEmail = {
  readonly locale: Locale;
  readonly churchName: string;
  readonly inviterName: string;
  readonly roleName: string;
  readonly link: string;
  readonly expiresAt: Date;
  readonly timeZone: string;
};

export const invitationEmail = (input: InvitationEmail) => {
  const t = translator(input.locale, input.timeZone);
  const values = { church: input.churchName, inviter: input.inviterName, role: input.roleName };
  return {
    subject: t("invitation.subject", values),
    ...render({
      locale: input.locale,
      preheader: t("invitation.preheader", values),
      heading: t("invitation.heading", values),
      paragraphs: [
        t("invitation.body", values),
        t("invitation.expires", { date: input.expiresAt }),
      ],
      action: { label: t("invitation.action"), url: input.link },
      footnote: t("invitation.footnote"),
    }),
  };
};

export type PasswordResetEmail = {
  readonly locale: Locale;
  readonly name: string;
  readonly url: string;
};

export const passwordResetEmail = (input: PasswordResetEmail) => {
  const t = translator(input.locale);
  return {
    subject: t("reset.subject"),
    ...render({
      locale: input.locale,
      preheader: t("reset.preheader"),
      heading: t("reset.heading", { name: input.name }),
      paragraphs: [t("reset.body")],
      action: { label: t("reset.action"), url: input.url },
      footnote: t("reset.footnote"),
    }),
  };
};
