import { z } from "zod";
import { EntityId } from "@/lib/ids";
import type { GameLogic, MoveResult } from "../model";

/** Geocache (spec 17): codes hidden around the venue; each one scores once. */
const Cache = z.object({
  id: EntityId,
  /** Where it's hidden: for the host, never sent to phones until found. */
  label: z.string().min(1).max(80),
  code: z.string().min(3).max(16),
});
export const CacheContent = z
  .object({ caches: z.array(Cache).min(1).max(30) })
  .strict()
  .refine((c) => new Set(c.caches.map((x) => normalizeCode(x.code))).size === c.caches.length, {
    message: "Each cache needs its own code.",
  })
  .refine((c) => new Set(c.caches.map((x) => x.id)).size === c.caches.length, {
    message: "Each cache needs its own id.",
  });
export type CacheContent = z.infer<typeof CacheContent>;

/** Codes match without case, spaces or dashes. */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Wrong codes in a row before the box waits, and how long it waits (S17-AC4). */
export const MAX_MISSES = 5;
export const LOCK_MS = 30_000;

export type CacheState = {
  found: string[];
  total: number;
  misses: number;
  lockedUntil: number;
  last: "found" | "again" | "wrong" | "locked" | null;
  step: number;
};

export type CacheView = {
  kind: "hunting" | "done";
  found: { label: string }[];
  total: number;
  last: CacheState["last"];
  lockedForMs: number;
};

const Move = z.object({ type: z.literal("code"), code: z.string().max(40) });

const fail = (message: string): MoveResult<CacheState> => ({ ok: false, message });

export const cache: GameLogic<CacheContent, CacheState, CacheView> = {
  content: CacheContent,
  once: true,
  progressive: true,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      `${String(c.caches.length)} codes are hidden around the party.`,
      "Find one, type it in, and score right away.",
      "Each code counts once for you. Keep hunting until you've found them all.",
    ],
  }),
  create: (c) => ({
    found: [],
    total: c.caches.length,
    misses: 0,
    lockedUntil: 0,
    last: null,
    step: 0,
  }),
  tick: (s) => s,
  view: (s, c, { now }) => ({
    kind: s.found.length >= s.total ? "done" : "hunting",
    found: s.found.map((id) => ({ label: c.caches.find((x) => x.id === id)?.label ?? "A cache" })),
    total: s.total,
    last: s.last,
    lockedForMs: Math.max(0, s.lockedUntil - now),
  }),
  move(s, c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("Type a code.");
    const step = s.step + 1;
    if (now < s.lockedUntil) return { ok: true, state: { ...s, last: "locked", step } };
    const code = normalizeCode(parsed.data.code);
    const hit = c.caches.find((x) => normalizeCode(x.code) === code);
    if (!hit) {
      const misses = s.misses + 1;
      return {
        ok: true,
        state: {
          ...s,
          misses: misses >= MAX_MISSES ? 0 : misses,
          lockedUntil: misses >= MAX_MISSES ? now + LOCK_MS : s.lockedUntil,
          last: misses >= MAX_MISSES ? "locked" : "wrong",
          step,
        },
      };
    }
    if (s.found.includes(hit.id))
      return { ok: true, state: { ...s, misses: 0, last: "again", step } };
    return {
      ok: true,
      state: { ...s, found: [...s.found, hit.id], misses: 0, last: "found", step },
    };
  },
  isOver: (s) => s.found.length >= s.total,
  score: (s, points) => Math.round((points * s.found.length) / Math.max(1, s.total)),
  step: (s) => s.step,
};
