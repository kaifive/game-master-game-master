import { z } from "zod";
import { defineShowdown, type MoveResult } from "./model";

/**
 * A stand-in showdown for testing the framework (specs 11 and 24): every
 * team taps once inside a 5-second window from the shared start; a tap scores
 * 10, the quickest tap 20. The taps stay secret until the reveal.
 */
type TapState = { startsAt: number; closesAt: number; taps: Record<string, number> };

export const TAP_WINDOW_MS = 5000;

export const tapShowdown = defineShowdown<{ rounds?: number | undefined }, TapState>({
  content: z.object({ rounds: z.number().int().min(1).max(10).optional() }),
  demo: "Tap once when the round starts. The quickest team scores double.",
  rounds: (c) => c.rounds ?? 2,
  deal: (_c, { startsAt }) => ({ startsAt, closesAt: startsAt + TAP_WINDOW_MS, taps: {} }),
  move(s, _c, { teamId, move, now }): MoveResult<TapState> {
    if (move !== "tap") return { ok: false, message: "That isn't a tap." };
    if (now < s.startsAt) return { ok: false, message: "Not yet!" };
    if (now > s.closesAt) return { ok: false, message: "Time's up." };
    if (s.taps[teamId] !== undefined) return { ok: false, message: "You already tapped." };
    return { ok: true, state: { ...s, taps: { ...s.taps, [teamId]: now - s.startsAt } } };
  },
  tick: (s) => s,
  over: (s, _c, now) => now > s.closesAt,
  score(s, _c, teams) {
    const times = Object.values(s.taps);
    const best = times.length > 0 ? Math.min(...times) : null;
    return Object.fromEntries(
      teams.map((t) => {
        const ms = s.taps[t];
        return [t, ms === undefined ? 0 : ms === best ? 20 : 10];
      }),
    );
  },
  view(s, _c, { role, revealed }) {
    const mine = role.kind === "tv" ? undefined : s.taps[role.teamId];
    return {
      startsAt: s.startsAt,
      closesAt: s.closesAt,
      tapped: mine !== undefined,
      // Other teams' taps are secret until the reveal (S24-AC7).
      taps: revealed ? s.taps : null,
    };
  },
});

/** A turn-based stand-in: teams take turns saying "pass" in a rotating order, one round per team. */
type PassState = { order: string[]; at: number; turnStarted: number; passed: string[] };

export const passShowdown = defineShowdown<Record<string, never>, PassState>({
  content: z.object({}).strict(),
  demo: "Pass the snowball along on your turn.",
  rounds: (_c, teams) => teams,
  turns: true,
  deal: (_c, { teams, round, startsAt }) => {
    const shift = (round - 1) % teams.length;
    return {
      order: [...teams.slice(shift), ...teams.slice(0, shift)],
      at: 0,
      turnStarted: startsAt,
      passed: [],
    };
  },
  move(s, _c, { teamId, move, now }) {
    if (move !== "pass") return { ok: false, message: "That isn't a pass." };
    if (s.order[s.at] !== teamId) return { ok: false, message: "It isn't your turn." };
    return {
      ok: true,
      state: { ...s, at: s.at + 1, turnStarted: now, passed: [...s.passed, teamId] },
    };
  },
  tick(s, _c, now) {
    // A turn times out after 5 s.
    if (s.at >= s.order.length || now - s.turnStarted < 5000) return s;
    return { ...s, at: s.at + 1, turnStarted: now };
  },
  over: (s) => s.at >= s.order.length,
  score: (s, _c, teams) => Object.fromEntries(teams.map((t) => [t, s.passed.includes(t) ? 10 : 0])),
  turn: (s) => {
    const teamId = s.order[s.at];
    return teamId ? { teamId, turnNo: s.at } : null;
  },
  view: (s) => ({ order: s.order, at: s.at, passed: s.passed }),
});
