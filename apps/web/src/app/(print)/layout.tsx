import type { ReactNode } from "react";

export default function PrintLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-muted px-4 py-8 print:bg-white print:p-0">{children}</div>;
}
