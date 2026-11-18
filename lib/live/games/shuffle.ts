import { z } from "zod";
import { seededRandom, shuffled } from "@/lib/games";
import { leadOrder } from "../fairness";
import { MAX_TEAMS, defineShowdown, type Role, type ShowdownGame, type TurnInfo } from "../model";

/**
 * Present Shuffle (spec 27, S27-AC2): presents show their points, cover up
 * and shuffle around the TV; teams take turns picking one, first pick
 * rotating each round. A picked present is gone for everyone.
 */
const Content = z.object({
  /** At least one more than the most teams, so the last team still has a choice. */
  presents: z
    .number()
    .int()
    .min(MAX_TEAMS + 1)
    .max(12)
    .default(9),
  values: z
    .array(z.number().int().min(1).max(500))
    .min(MAX_TEAMS + 1)
    .default([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]),
  showMs: z.number().int().min(1000).max(15_000).default(4000),
  shuffleMs: z.number().int().min(1000).max(20_000).default(5000),
  swaps: z.number().int().min(1).max(30).default(10),
  pickMs: z.number().int().min(4000).max(60_000).default(15_000),
});

export type ShuffleState = {
  /** Each present's points, by present id. */
  values: number[];
  /** Pairs of slots swapped, in order, during the shuffle. */
  swaps: [number, number][];
  /** Which present sits in each slot once the shuffle is done. */
  slots: number[];
  order: string[];
  startsAt: number;
  showEndsAt: number;
  shuffleEndsAt: number;
  pickMs: number;
  /** Turns taken; whose turn is order[at]. */
  at: number;
  turnStartedAt: number;
  picks: Record<string, { slot: number; value: number } | null>;
};

/** The slots after each swap: slot -> present, starting with present i in slot i. */
export function afterSwaps(count: number, swaps: readonly [number, number][]): number[] {
  const slots = Array.from({ length: count }, (_, i) => i);
  for (const [a, b] of swaps) [slots[a], slots[b]] = [slots[b] ?? 0, slots[a] ?? 0];
  return slots;
}

const whose = (s: ShuffleState) => s.order[s.at] ?? null;
const taken = (s: ShuffleState) =>
  new Set(Object.values(s.picks).flatMap((p) => (p ? [p.slot] : [])));

const pass = (
  s: ShuffleState,
  teamId: string,
  pick: { slot: number; value: number } | null,
  now: number,
): ShuffleState => ({
  ...s,
  picks: { ...s.picks, [teamId]: pick },
  at: s.at + 1,
  turnStartedAt: now,
});

type C = z.infer<typeof Content>;
type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: ShuffleState, _c: unknown, { role, revealed, now }: ViewCtx) {
  const tv = role.kind === "tv";
  const shuffling = now < s.shuffleEndsAt;
  const team = now >= s.shuffleEndsAt ? whose(s) : null;
  return {
    count: s.values.length,
    order: s.order,
    startsAt: s.startsAt,
    showEndsAt: s.showEndsAt,
    shuffleEndsAt: s.shuffleEndsAt,
    // The TV shows the points and plays the shuffle the room follows; phones
    // never get them, and nobody does once the presents have settled (S24-AC7).
    shown: (tv && shuffling) || revealed ? s.values : null,
    swaps: tv && shuffling ? s.swaps : null,
    final: revealed ? s.slots : null,
    picks: s.picks,
    turn: team,
    turnEndsAt: s.turnStartedAt + s.pickMs,
    pickMs: s.pickMs,
    myTurn: !tv && team === role.teamId,
  };
}

const game: ShowdownGame<C, ShuffleState> = {
  content: Content,
  demo: "Watch the points on the presents, then follow the 100-point one as they shuffle. Teams take turns picking one each.",
  timeout: "Out of time? 15 seconds to pick, or you get no present.",
  rounds: (_c, teams) => Math.max(1, teams),
  deal(c, { seed, round, teams, startsAt }) {
    const random = seededRandom(seed);
    const values = shuffled(c.values, random).slice(0, c.presents);
    while (values.length < c.presents) values.push(c.values[values.length % c.values.length] ?? 10);
    const swaps: [number, number][] = Array.from({ length: c.swaps }, () => {
      const a = Math.floor(random() * c.presents);
      const b = (a + 1 + Math.floor(random() * (c.presents - 1))) % c.presents;
      return [a, b];
    });
    const showEndsAt = startsAt + c.showMs;
    const shuffleEndsAt = showEndsAt + c.shuffleMs;
    return {
      values,
      swaps,
      slots: afterSwaps(c.presents, swaps),
      // Who picks first rotates so every team picks first once (S24-AC6).
      order: leadOrder(teams, round - 1),
      startsAt,
      showEndsAt,
      shuffleEndsAt,
      pickMs: c.pickMs,
      at: 0,
      turnStartedAt: shuffleEndsAt,
      picks: {},
    };
  },
  move(s, _c, { teamId, move, now }) {
    const parsed = z.object({ slot: z.number().int() }).safeParse(move);
    if (!parsed.success) return { ok: false, message: "Tap a present." };
    if (now < s.shuffleEndsAt) return { ok: false, message: "Watch the shuffle first!" };
    if (whose(s) !== teamId) return { ok: false, message: "It isn't your turn." };
    const { slot } = parsed.data;
    if (slot < 0 || slot >= s.slots.length) return { ok: false, message: "Tap a present." };
    if (taken(s).has(slot)) return { ok: false, message: "That one's gone." };
    return {
      ok: true,
      state: pass(s, teamId, { slot, value: s.values[s.slots[slot] ?? 0] ?? 0 }, now),
    };
  },
  // Too slow: no present that round.
  tick(s, _c, now) {
    let st = s;
    while (whose(st) !== null && now >= st.shuffleEndsAt && now > st.turnStartedAt + st.pickMs)
      st = pass(st, whose(st) ?? "", null, st.turnStartedAt + st.pickMs);
    return st;
  },
  over: (s) => s.at >= s.order.length,
  score: (s, _c, teams) => Object.fromEntries(teams.map((t) => [t, s.picks[t]?.value ?? 0])),
  turn: (s, _c, now): TurnInfo => {
    const team = whose(s);
    return team && now >= s.shuffleEndsAt ? { teamId: team, turnNo: s.at } : null;
  },
  view,
};

export const shuffle = defineShowdown(game);
export type ShuffleView = ReturnType<typeof view>;
