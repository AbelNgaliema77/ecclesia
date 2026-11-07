import { Link2, Mail } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { localized } from "@/i18n/config";
import { InviteDialog } from "@/modules/members/invite-dialog";
import { MemberActions, RevokeInvitation } from "@/modules/members/member-actions";
import { loadMembersPage } from "@/modules/members/queries";
import { SettingsSection } from "@/modules/settings/section";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Members" };

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default async function MembersPage() {
  const [data, context, t, format, locale] = await Promise.all([
    loadMembersPage(),
    getChurchContext(),
    getTranslations("settings.members"),
    getFormatter(),
    getLocale(),
  ]);
  const churchName = context.membership.churchName;
  const roleOptions = data.roles.map((r) => ({ id: r.id, label: localized(r.name, locale) }));
  const peopleOptions = data.people.map((p) => ({ id: p.id, label: p.name }));
  const defaultRole =
    data.roles.find((r) => r.key === "teamLeader")?.id ?? data.roles[0]?.id ?? null;
  const now = Date.now();

  return (
    <div className="flex flex-col gap-10">
      <SettingsSection
        title={t("title")}
        lead={t("lead", { church: churchName })}
        actions={
          data.readOnly ? null : (
            <InviteDialog
              churchName={churchName}
              roles={roleOptions}
              people={peopleOptions}
              defaultRoleId={defaultRole}
            />
          )
        }
      >
        <ul aria-label={t("membersHeading")} className="card divide-y divide-line">
          {data.members.map((member) => {
            const isSelf = member.userId === data.currentUserId;
            return (
              <li
                key={member.membershipId}
                className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
              >
                <span
                  aria-hidden
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-soft-ink"
                >
                  {initialsOf(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="truncate">{member.name}</span>
                    {isSelf ? <Badge tone="gold">{t("you")}</Badge> : null}
                  </p>
                  <p className="truncate text-sm text-ink-faint">{member.email}</p>
                  {member.personName ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                      <Link2 aria-hidden className="size-3.5" />
                      {member.personName}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="brand">{localized(member.roleName, locale)}</Badge>
                  <span className="hidden text-xs text-ink-faint md:inline">
                    {t("joined", {
                      date: format.dateTime(member.joinedAt, { dateStyle: "medium" }),
                    })}
                  </span>
                  {data.readOnly ? null : (
                    <MemberActions
                      membershipId={member.membershipId}
                      name={member.name}
                      churchName={churchName}
                      roleId={member.roleId}
                      personId={member.personId}
                      isSelf={isSelf}
                      roles={roleOptions}
                      people={peopleOptions}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </SettingsSection>

      <SettingsSection title={t("pendingHeading")}>
        {data.invitations.length === 0 ? (
          <p className="card px-5 py-6 text-sm text-ink-faint">{t("noPending")}</p>
        ) : (
          <ul className="card divide-y divide-line">
            {data.invitations.map((invitation) => {
              const expired = invitation.expiresAt.getTime() < now;
              return (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
                >
                  <span className="icon-tile size-11">
                    <Mail aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{invitation.email}</p>
                    <p className="text-sm text-ink-faint">
                      {expired
                        ? t("expired")
                        : t("expires", {
                            date: format.dateTime(invitation.expiresAt, { dateStyle: "medium" }),
                          })}
                    </p>
                  </div>
                  <Badge tone="neutral">{localized(invitation.roleName, locale)}</Badge>
                  {data.readOnly ? null : (
                    <RevokeInvitation id={invitation.id} email={invitation.email} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}
