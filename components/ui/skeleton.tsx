import { cx } from "@/lib/ui";

/**
 * A placeholder that pulses while something loads, so nothing shows as 0 or
 * blank before it arrives (Khai, 2026-11-14). `label` is read out instead.
 */
export function Skeleton({ className, label }: { className?: string; label?: string }) {
  return (
    <span
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
      className={cx(
        "block rounded-gm bg-[color-mix(in_srgb,var(--gm-text)_14%,transparent)] motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

/** A few pulsing rows, for a list that's still loading. */
export function SkeletonList({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
