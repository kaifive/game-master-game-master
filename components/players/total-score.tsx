"use client";

import { PointsIcon } from "@/components/icons/points";
import { CountUp } from "@/components/motion";
import { useOptionalDevice } from "./device";

/** The active player's total in the event header; points from games fly here (S08-AC15). */
export function TotalScore() {
  const device = useOptionalDevice();
  if (!device?.active) return null;
  return (
    <span
      data-total-score
      aria-label={`${device.active.nickname}: ${String(device.total)} points`}
      className="inline-flex min-w-14 items-center justify-center gap-1 rounded-full bg-black/25 px-3 py-1 font-gm-display text-lg font-bold tabular-nums"
    >
      <span className="text-2xl leading-none">
        <PointsIcon />
      </span>
      <CountUp value={device.total} />
    </span>
  );
}
