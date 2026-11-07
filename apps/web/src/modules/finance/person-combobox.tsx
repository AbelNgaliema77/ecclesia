"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { controlClasses } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { type PersonOption, searchGiversAction } from "./giving-actions";

type PersonComboboxProps = {
  name: string;
  label: string;
  initial?: PersonOption | null;
  placeholder?: string;
  onSelect?: (person: PersonOption | null) => void;
  hideLabel?: boolean;
};

export function PersonCombobox({
  name,
  label,
  initial = null,
  placeholder,
  onSelect,
  hideLabel = false,
}: PersonComboboxProps) {
  const t = useTranslations("finance.people");
  const id = useId();
  const listId = `${id}-list`;
  const [selected, setSelected] = useState<PersonOption | null>(initial);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PersonOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const request = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setOptions([]);
      return;
    }
    const current = ++request.current;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const found = await searchGiversAction(term);
        if (current === request.current) {
          setOptions(found);
          setActive(0);
        }
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const choose = (person: PersonOption | null) => {
    setSelected(person);
    setQuery("");
    setOpen(false);
    onSelect?.(person);
  };

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className={hideLabel ? "sr-only" : "text-sm font-semibold"}>{label}</span>
        <input type="hidden" name={name} value={selected.id} />
        <div className="flex h-11 items-center gap-2 rounded-control border border-line bg-muted px-3.5">
          <span className="flex-1 truncate font-medium">{selected.name}</span>
          {selected.givingNumber ? (
            <span className="text-xs font-semibold text-ink-faint">{selected.givingNumber}</span>
          ) : null}
          <button
            type="button"
            onClick={() => choose(null)}
            className="inline-flex size-7 items-center justify-center rounded-full text-ink-faint hover:bg-muted hover:text-ink"
            aria-label={t("clear", { name: selected.name })}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-semibold"}>
        {label}
      </label>
      <input type="hidden" name={name} value="" />
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={placeholder ?? t("placeholder")}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) => Math.min(value + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(value - 1, 0));
            } else if (event.key === "Enter" && open && options[active]) {
              event.preventDefault();
              choose(options[active] ?? null);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn(controlClasses, "h-11 pl-9")}
        />
      </div>
      {open && query.trim().length >= 2 ? (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-card border border-line bg-surface p-1 shadow-pop"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-ink-faint">
              {pending ? t("searching") : t("none")}
            </p>
          ) : (
            options.map((option, index) => (
              <div
                key={option.id}
                id={`${listId}-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-control px-3 py-2.5 text-sm",
                  index === active && "bg-muted",
                )}
              >
                <span className="flex-1 font-medium">{option.name}</span>
                {option.givingNumber ? (
                  <span className="text-xs font-semibold text-ink-faint">
                    {option.givingNumber}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
