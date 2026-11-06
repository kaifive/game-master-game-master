"use client";

import { useTheme } from "@/components/theme/context";
import { HollyIcon } from "./holly";

/** Icons a theme can pick for points (its `icons.points`); a star by default. */
const ICONS = {
  star: () => (
    <svg viewBox="0 0 24 24" className="size-[1em]" fill="currentColor">
      <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  ),
  holly: () => <HollyIcon className="h-[1em] w-[1.4em]" />,
} as const;

export type PointsIconName = keyof typeof ICONS;
export const POINTS_ICONS = Object.keys(ICONS) as PointsIconName[];

/** The event's points icon (S09-AC13): holly at the winter party, a star by default. */
export function PointsIcon({ name }: { name?: string }) {
  const theme = useTheme();
  const wanted = name ?? theme?.icons.points ?? "star";
  const chosen: PointsIconName = wanted in ICONS ? (wanted as PointsIconName) : "star";
  const Icon = ICONS[chosen];
  return (
    <span aria-hidden="true" data-icon={chosen} className="inline-flex shrink-0">
      <Icon />
    </span>
  );
}
