"use client";

import { useEffect, useRef } from "react";
import { useCelebrate, useReducedMotion } from "@/components/motion";
import { useServerTime } from "@/components/live/games/shared";
import { LAND_MS, type RaffleView } from "@/lib/guests";

/**
 * The TV's Raffle screen (spec 32): names flip fast; after Stop they slow over
 * LAND_MS and land on the winner at `landsAt`, the same moment on every TV.
 * The flipping is decoration: the server drew the winner when Stop was pressed.
 */

/** Names a second while flipping. */
const FLIPS_PER_S = 15;
/** Name changes while landing, slowing as it goes. */
const LANDING_FLIPS = 22;

/** Which name shows at `now`: fast while flipping; easing out after Stop; then the winner. */
export function nameAt(r: RaffleView, now: number): string | null {
  const names = r.names;
  if (r.status === "landed") return r.winner;
  if (names.length === 0) return r.winner;
  if (r.status === "flipping")
    return names[Math.floor((now / 1000) * FLIPS_PER_S) % names.length] ?? null;
  if (r.status === "landing" && r.landsAt !== null) {
    const p = Math.min(1, Math.max(0, 1 - (r.landsAt - now) / LAND_MS));
    if (p >= 1) return r.winner;
    // An ease-out: changes come quickly at first and slow towards the end.
    const step = Math.floor(LANDING_FLIPS * (1 - (1 - p) ** 3));
    return names[step % names.length] ?? null;
  }
  return null;
}

export function RaffleScreen({
  raffle,
  serverNow,
}: {
  raffle: RaffleView;
  serverNow: () => number;
}) {
  const reduced = useReducedMotion();
  const moving = !reduced && (raffle.status === "flipping" || raffle.status === "landing");
  const now = useServerTime(serverNow, moving);
  // Landing ends by the clock here, so every TV lands at landsAt (S32-AC9).
  const status =
    raffle.status === "landing" && raffle.landsAt !== null && now >= raffle.landsAt
      ? "landed"
      : raffle.status;
  const celebrate = useCelebrate();
  const cheered = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "landed" || !raffle.winner || !raffle.drawId) return;
    if (cheered.current === raffle.drawId) return;
    cheered.current = raffle.drawId;
    celebrate({
      id: `raffle-${raffle.drawId}`,
      kind: "judged-right",
      text: `${raffle.winner} wins!`,
    });
  }, [status, raffle.winner, raffle.drawId, celebrate]);

  const view = { ...raffle, status };
  const name = reduced ? (status === "landed" ? raffle.winner : null) : nameAt(view, now);
  return (
    <section
      aria-label="Raffle"
      className="grid h-full content-center justify-items-center gap-[4vh] px-[4vw] text-center"
    >
      <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold text-gm-tile-correct">
        {status === "landed" ? "Winner!" : "Raffle"}
      </p>
      {status === "idle" ? (
        <>
          <p className="m-0 font-gm-display text-[clamp(3rem,12vh,9rem)] leading-none font-bold">
            Get ready…
          </p>
          <p className="m-0 text-[clamp(1.4rem,4vh,3rem)] text-gm-text-muted">
            {raffle.people} {raffle.people === 1 ? "person" : "people"} · {raffle.tickets}{" "}
            {raffle.tickets === 1 ? "ticket" : "tickets"}
          </p>
        </>
      ) : (
        <p
          aria-live={status === "landed" ? "assertive" : "off"}
          data-raffle-name={status}
          className="m-0 max-w-full font-gm-display text-[clamp(3rem,16vh,12rem)] leading-tight font-bold text-balance break-words"
        >
          {name ?? "Drawing…"}
        </p>
      )}
    </section>
  );
}
