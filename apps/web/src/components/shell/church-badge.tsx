import Image from "next/image";
import { cn } from "@/lib/cn";

export const churchInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export function ChurchBadge({
  name,
  logoVersion,
  className,
}: {
  name: string;
  logoVersion: string | null;
  className?: string;
}) {
  if (logoVersion) {
    return (
      <Image
        src={`/branding/logo?v=${logoVersion}`}
        alt=""
        width={160}
        height={160}
        unoptimized
        className={cn(
          "shrink-0 rounded-control bg-surface object-contain ring-1 ring-line",
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control bg-gold-soft text-sm font-bold text-gold-ink",
        className,
      )}
    >
      {churchInitials(name)}
    </span>
  );
}
