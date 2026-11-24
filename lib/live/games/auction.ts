import { z } from "zod";
import { seededRandom, shuffled } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";

/**
 * Auction (spec 26, S26-AC1): a prize goes up each round and every team
 * secretly bids one of its numbers 1 to 10, each once per game. Tied bids
 * cancel; the highest bid nobody tied wins the prize.
 */
export const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const Content = z.object({
  rounds: z.number().int().min(1).max(10).default(5),
  /**
   * The prizes, dealt in a seeded order: one per round. They add up to the
   * game's 150, so winning one round never decides the night (Khai, 2026-11-24).
   */
  prizes: z.array(z.number().int().min(1).max(500)).min(1).default([10, 20, 30, 40, 50]),
  bidMs: z.number().int().min(5000).max(60_000).default(15_000),
});

export type AuctionState = {
  startsAt: number;
  closesAt: number;
  teams: string[];
  prize: number;
  /** This round's bids, secret until the reveal. */
  bids: Record<string, number>;
  /** The numbers each team still has, before this round's bid. */
  left: Record<string, number[]>;
  /** The prizes still to come, in order (the first is this round's). */
  prizes: number[];
  /** Points each team has won in earlier rounds. */
  won: Record<string, number>;
};

/** The winner: the highest bid nobody else made, or null if every bid tied. */
export function auctionWinner(bids: Record<string, number>): string | null {
  const counts = new Map<number, number>();
  for (const b of Object.values(bids)) counts.set(b, (counts.get(b) ?? 0) + 1);
  let best: { team: string; bid: number } | null = null;
  for (const [team, bid] of Object.entries(bids))
    if (counts.get(bid) === 1 && (!best || bid > best.bid)) best = { team, bid };
  return best?.team ?? null;
}

type C = z.infer<typeof Content>;
type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: AuctionState, _c: unknown, { role, revealed }: ViewCtx) {
  const winner = revealed ? auctionWinner(s.bids) : null;
  return {
    startsAt: s.startsAt,
    closesAt: s.closesAt,
    prize: s.prize,
    /** Everyone's numbers left are public: part of the strategy (spec 26). */
    left: s.left,
    won: s.won,
    mine: role.kind !== "tv" ? (s.bids[role.teamId] ?? null) : null,
    lockedIn: Object.keys(s.bids),
    bids: revealed ? s.bids : null,
    winner,
  };
}

const game: ShowdownGame<C, AuctionState> = {
  content: Content,
  demo: "Bid 1 to 10. The highest number nobody else picked wins!",
  timeout: "Out of time? You spend your lowest number.",
  rounds: (c) => c.rounds,
  deal(c, { seed, startsAt, teams, prev }) {
    // Round 1 deals the prizes in a seeded order; later rounds carry everything forward.
    const prizes = prev ? prev.prizes.slice(1) : shuffled(c.prizes, seededRandom(seed));
    const left = Object.fromEntries(
      teams.map((t) => {
        const had = prev?.left[t] ?? [...NUMBERS];
        const spent = prev?.bids[t];
        return [t, spent === undefined ? had : had.filter((n) => n !== spent)];
      }),
    );
    const won = { ...(prev?.won ?? {}) };
    const w = prev ? auctionWinner(prev.bids) : null;
    if (prev && w) won[w] = (won[w] ?? 0) + prev.prize;
    return {
      startsAt,
      closesAt: startsAt + c.bidMs,
      teams: [...teams],
      prize: prizes[0] ?? c.prizes[0] ?? 10,
      bids: {},
      left,
      prizes: prizes.length > 0 ? prizes : [...c.prizes],
      won,
    };
  },
  move(s, _c, { teamId, move, now }) {
    const parsed = z.object({ bid: z.number().int() }).safeParse(move);
    if (!parsed.success) return { ok: false, message: "Pick one of your numbers." };
    if (now < s.startsAt) return { ok: false, message: "Not yet!" };
    if (now > s.closesAt) return { ok: false, message: "Time's up." };
    if (s.bids[teamId] !== undefined) return { ok: false, message: "You've bid." };
    if (!(s.left[teamId] ?? []).includes(parsed.data.bid))
      return { ok: false, message: "You've used that number." };
    return { ok: true, state: { ...s, bids: { ...s.bids, [teamId]: parsed.data.bid } } };
  },
  tick: (s) => s,
  // A team that didn't bid spends its lowest number left.
  close(s) {
    const bids = { ...s.bids };
    for (const t of s.teams)
      if (bids[t] === undefined) {
        const low = Math.min(...(s.left[t] ?? []));
        if (Number.isFinite(low)) bids[t] = low;
      }
    return { ...s, bids };
  },
  over: (s, _c, now) => now > s.closesAt || s.teams.every((t) => s.bids[t] !== undefined),
  score(s, _c, teams) {
    const w = auctionWinner(s.bids);
    return Object.fromEntries(teams.map((t) => [t, t === w ? s.prize : 0]));
  },
  view,
};

export const auction = defineShowdown(game);
export type AuctionView = ReturnType<typeof view>;
