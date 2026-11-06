import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  lead?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, lead, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-[2rem] leading-tight font-bold sm:text-display">{title}</h1>
        {lead ? (
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{lead}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
