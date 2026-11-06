"use client";

import { useTheme } from "@/components/theme/context";

/** Icons a theme can pick for points (its `icons.points`); a star by default. */
const ICONS = {
  star: () => (
    <svg viewBox="0 0 24 24" className="size-[1em]" fill="currentColor">
      <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  ),
  mistletoe: () => (
    <svg viewBox="0 0 24 24" className="size-[1em]">
      <path d="M12 3v6" stroke="#2b7a57" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path
        d="M12 9c-2-4.5-7.2-5.3-9-3.4 2.4.3 4 2.6 4.4 5 1.7-.4 3.4-.9 4.6-1.6z"
        fill="#2b7a57"
      />
      <path d="M12 9c2-4.5 7.2-5.3 9-3.4-2.4.3-4 2.6-4.4 5-1.7-.4-3.4-.9-4.6-1.6z" fill="#3c9a6e" />
      <circle cx="12" cy="13" r="3" fill="#f4f1e6" stroke="#cfc9b4" strokeWidth=".8" />
      <circle cx="8.6" cy="16.2" r="2.6" fill="#f4f1e6" stroke="#cfc9b4" strokeWidth=".8" />
      <circle cx="15.4" cy="16.2" r="2.6" fill="#f4f1e6" stroke="#cfc9b4" strokeWidth=".8" />
      <circle cx="12" cy="19.4" r="2.4" fill="#f4f1e6" stroke="#cfc9b4" strokeWidth=".8" />
    </svg>
  ),
} as const;

export type PointsIconName = keyof typeof ICONS;
export const POINTS_ICONS = Object.keys(ICONS) as PointsIconName[];

/** The event's points icon (S09-AC13): mistletoe at the winter party, a star by default. */
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
