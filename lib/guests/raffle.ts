import { ticketsOf, type Guest } from "./model";

/**
 * The raffle (spec 32, ADR-047): names flip on the TV; Stop draws a ticket on
 * the server, each equally likely, and the names ease onto the winner by
 * `landsAt`. Claimed uses up that ticket; Not here skips the guest for the
 * rest of this raffle and draws again.
 */

export type RaffleStatus = "idle" | "flipping" | "stopped";

export type RaffleState = {
  /** One prize: kept through Not here, new after Claimed. */
  raffleId: string;
  /** One flip and stop: every step carries it, so a repeat does nothing (S32-AC11). */
  drawId: string;
  status: RaffleStatus;
  startedAt: number | null;
  landsAt: number | null;
  winner: { guestId: string; name: string } | null;
  /** Guests skipped as Not here in this raffle. */
  skipped: string[];
  /** Up to FLIP_NAMES names for the TV to flip through, drawn at Start. */
  names: string[];
};

export type RaffleStep = "start" | "stop" | "claim" | "notHere";

/** How long the names take to ease onto the winner after Stop. */
export const LAND_MS = 3500;
/** Names the TV flips through: enough to look random, small enough to poll. */
export const FLIP_NAMES = 60;

/** A uniform whole number from 0 to n − 1 (on the server, `crypto.randomInt`). */
export type RandomInt = (n: number) => number;

/**
 * Draws one ticket from every guest not skipped, each ticket equally likely
 * (S32-AC8): a guest with 3 tickets is 3 times as likely as one with 1.
 */
export function drawTicket(
  guests: readonly Guest[],
  skipped: readonly string[],
  randomInt: RandomInt,
): Guest | null {
  const skip = new Set(skipped);
  const entries = guests
    .filter((g) => !skip.has(g.id))
    .map((g) => [g, ticketsOf(g)] as const)
    .filter(([, t]) => t > 0);
  const total = entries.reduce((n, [, t]) => n + t, 0);
  if (total === 0) return null;
  let pick = randomInt(total);
  for (const [g, t] of entries) {
    if (pick < t) return g;
    pick -= t;
  }
  return null;
}

/** The names to flip: everyone in the draw once, shuffled, at most FLIP_NAMES (S32-AC13). */
export function flipNames(
  guests: readonly Guest[],
  skipped: readonly string[],
  randomInt: RandomInt,
): string[] {
  const skip = new Set(skipped);
  const names = guests.filter((g) => !skip.has(g.id) && ticketsOf(g) > 0).map((g) => g.name);
  for (let i = names.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [names[i], names[j]] = [names[j] as string, names[i] as string];
  }
  return names.slice(0, FLIP_NAMES);
}

export type RaffleCtx = { now: number; id: () => string; randomInt: RandomInt };

export type RaffleOutcome =
  | {
      ok: true;
      raffle: RaffleState;
      /** Claimed: the guest whose ticket is used up. */
      claim?: string;
      /** Said to the host when the draw couldn't go on. */
      notice?: string;
    }
  | { ok: false; message: string };

const NOBODY = "Nobody left to draw.";

function flipping(
  raffleId: string,
  skipped: string[],
  guests: readonly Guest[],
  ctx: RaffleCtx,
): RaffleState {
  return {
    raffleId,
    drawId: ctx.id(),
    status: "flipping",
    startedAt: ctx.now,
    landsAt: null,
    winner: null,
    skipped,
    names: flipNames(guests, skipped, ctx.randomInt),
  };
}

const idle = (r: RaffleState, ctx: RaffleCtx): RaffleState => ({
  ...r,
  drawId: ctx.id(),
  status: "idle",
  startedAt: null,
  landsAt: null,
  winner: null,
  skipped: [],
  names: [],
});

/** One host step (S32 Behavior 13). A step for an old draw changes nothing. */
export function raffleStep(
  r: RaffleState | null,
  guests: readonly Guest[],
  step: RaffleStep,
  drawId: string | undefined,
  ctx: RaffleCtx,
): RaffleOutcome {
  const stale = r !== null && drawId !== undefined && drawId !== r.drawId;
  if (stale) return { ok: true, raffle: r };
  if (step === "start") {
    if (r && r.status !== "idle") return { ok: true, raffle: r };
    if (!drawTicket(guests, [], ctx.randomInt)) return { ok: false, message: NOBODY };
    return { ok: true, raffle: flipping(ctx.id(), [], guests, ctx) };
  }
  if (!r) return { ok: false, message: "Start the raffle first." };
  if (step === "stop") {
    if (r.status !== "flipping") return { ok: true, raffle: r };
    const winner = drawTicket(guests, r.skipped, ctx.randomInt);
    if (!winner) return { ok: true, raffle: idle(r, ctx), notice: NOBODY };
    return {
      ok: true,
      raffle: {
        ...r,
        status: "stopped",
        landsAt: ctx.now + LAND_MS,
        winner: { guestId: winner.id, name: winner.name },
      },
    };
  }
  if (r.status !== "stopped" || !r.winner) return { ok: true, raffle: r };
  if (r.landsAt !== null && ctx.now < r.landsAt)
    return { ok: false, message: "Wait for the name to land." };
  if (step === "claim") return { ok: true, raffle: idle(r, ctx), claim: r.winner.guestId };
  // Not here: skipped for this prize only, and the names flip again at once (Khai, 2026-11-25).
  const skipped = [...r.skipped, r.winner.guestId];
  if (!drawTicket(guests, skipped, ctx.randomInt))
    return { ok: true, raffle: { ...idle(r, ctx), skipped }, notice: NOBODY };
  return { ok: true, raffle: flipping(r.raffleId, skipped, guests, ctx) };
}

/** What the TV and Controls see of the raffle (S32-AC9, AC13). */
export type RaffleView = {
  status: "idle" | "flipping" | "landing" | "landed";
  drawId: string | null;
  landsAt: number | null;
  winner: string | null;
  names: string[];
  people: number;
  tickets: number;
};

export function raffleView(
  r: RaffleState | null,
  counts: { people: number; tickets: number },
  now: number,
): RaffleView {
  const status: RaffleView["status"] =
    !r || r.status === "idle"
      ? "idle"
      : r.status === "flipping"
        ? "flipping"
        : r.landsAt !== null && now < r.landsAt
          ? "landing"
          : "landed";
  return {
    status,
    drawId: r?.drawId ?? null,
    landsAt: r?.status === "stopped" ? r.landsAt : null,
    winner: r?.status === "stopped" ? (r.winner?.name ?? null) : null,
    names: r && r.status !== "idle" ? r.names : [],
    ...counts,
  };
}
