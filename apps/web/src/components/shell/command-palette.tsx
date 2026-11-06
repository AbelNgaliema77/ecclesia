"use client";

import { Command } from "cmdk";
import { CalendarPlus, CornerDownLeft, Search, UserPlus, UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { type PersonHit, searchPeopleAction } from "@/modules/search/actions";
import { NAV_ICONS } from "./nav-icon";
import type { NavItem } from "./nav-items";

type PaletteProps = {
  items: readonly NavItem[];
  canAddPerson: boolean;
  canCapture: boolean;
  canSearchPeople: boolean;
  variant: "bar" | "icon";
};

const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-faint";

const itemClass =
  "flex h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-[0.9375rem] text-ink-soft data-[selected=true]:bg-brand-soft data-[selected=true]:text-brand-soft-ink";

export function CommandPalette({
  items,
  canAddPerson,
  canCapture,
  canSearchPeople,
  variant,
}: PaletteProps) {
  const t = useTranslations("palette");
  const ts = useTranslations("people.status");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PersonHit[]>([]);
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!canSearchPeople || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      startSearch(async () => {
        const result = await searchPeopleAction(query);
        setHits(result.status === "success" ? result.data : []);
      });
    }, 180);
    return () => clearTimeout(handle);
  }, [query, canSearchPeople]);

  const actions = [
    ...(canCapture
      ? [{ key: "capture", href: "/attendance", icon: CalendarPlus, label: t("captureHeadcount") }]
      : []),
    ...(canAddPerson
      ? [{ key: "add-person", href: "/people/new", icon: UserPlus, label: t("addPerson") }]
      : []),
  ].filter((action) => matches(action.label, query));

  const pages = items.filter((item) => item.href && matches(item.label, query));

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href as Route);
  };

  return (
    <>
      {variant === "bar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-full max-w-md items-center gap-3 rounded-full border border-line bg-surface px-4 text-sm text-ink-faint shadow-card transition-colors hover:border-line-strong"
        >
          <Search aria-hidden className="size-4" />
          <span className="flex-1 text-left">{t("trigger")}</span>
          <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold text-ink-faint ring-1 ring-line ring-inset">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("trigger")}
          className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-card"
        >
          <Search aria-hidden className="size-[1.125rem]" />
        </button>
      )}

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label={t("label")}
        shouldFilter={false}
        overlayClassName="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"
        contentClassName="fixed inset-x-3 top-[12vh] z-50 mx-auto max-w-xl overflow-hidden rounded-hero border border-line bg-surface shadow-pop page-enter"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search aria-hidden className="size-5 text-ink-faint" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={t("placeholder")}
            className="h-14 flex-1 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
        <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-ink-faint">
            {searching ? t("searching") : t("empty")}
          </Command.Empty>

          {hits.length > 0 ? (
            <Command.Group heading={t("people")} className={groupClass}>
              {hits.map((hit) => (
                <Command.Item
                  key={hit.id}
                  value={`person-${hit.id}`}
                  onSelect={() => go(`/people/${hit.id}`)}
                  className={itemClass}
                >
                  <UserRound aria-hidden className="size-4" />
                  <span className="flex-1 text-ink">{hit.name}</span>
                  <span className="text-xs">{ts(hit.status)}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {actions.length > 0 ? (
            <Command.Group heading={t("actions")} className={groupClass}>
              {actions.map(({ key, href, icon: Icon, label }) => (
                <Command.Item key={key} value={key} onSelect={() => go(href)} className={itemClass}>
                  <Icon aria-hidden className="size-4" />
                  <span className="flex-1">{label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {pages.length > 0 ? (
            <Command.Group heading={t("navigate")} className={groupClass}>
              {pages.map((item) => {
                const Icon = NAV_ICONS[item.key];
                return (
                  <Command.Item
                    key={item.key}
                    value={`nav-${item.key}`}
                    onSelect={() => item.href && go(item.href)}
                    className={itemClass}
                  >
                    <Icon aria-hidden className="size-4" />
                    <span className="flex-1">{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ) : null}
        </Command.List>
        <div
          className={cn(
            "flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-ink-faint",
          )}
        >
          <CornerDownLeft aria-hidden className="size-3.5" />
          {t("hint")}
        </div>
      </Command.Dialog>
    </>
  );
}

const matches = (label: string, query: string) =>
  query.trim() === "" || label.toLowerCase().includes(query.trim().toLowerCase());
