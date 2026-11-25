import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { showdownTypes } from "@/lib/live";
import { cap, round, show, T0, tv } from "./showdown-kit.test.helpers";

/**
 * Screens drawn from a view older than their clock (Khai, 2026-11-24: the TV
 * crashed on a view fetched just before the round started). A phone or TV
 * polls every 0.7 s and its clock runs on between replies, so every showdown
 * must draw any moment from a view fetched up to a few seconds earlier, on
 * the TV and on a captain's phone, without throwing or logging an error.
 */

/** Content for games that can't run without some. */
const CONTENT: Record<string, unknown> = {
  buzzer: { questions: [{ id: "q1", prompt: "Name the staff", answer: "Gun" }] },
};

/** When the view was fetched, from well before the start to after the round. */
const FETCHED = [-1500, -50, 300, 1500, 2950, 3050, 5000, 8000, 12_000, 13_500, 20_000];
/** How long after that the screen draws it. */
const LAGS = [700, 4000];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("every showdown draws from a stale view (spec 11, S11-AC5)", () => {
  for (const type of showdownTypes())
    test(`S11-AC5: ${type} draws every moment from a view fetched up to 4 s before, on the TV and the phone, without errors`, () => {
      const errors: unknown[] = [];
      vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(" "));
      });
      const r = round(type, [], null, CONTENT[type] ?? {});
      for (const role of [tv, cap("t1"), cap("t2")])
        for (const fetched of FETCHED)
          for (const lag of LAGS) {
            const view = r.view(role, T0 + fetched);
            show(type, view, T0 + fetched + lag, role.kind === "tv" ? "tv" : "phone");
            cleanup();
          }
      // And the reveal, drawn late.
      show(type, r.view(tv, T0 + 30_000, true), T0 + 34_000, "tv");
      cleanup();
      show(type, r.view(cap("t1"), T0 + 30_000, true), T0 + 34_000);
      expect(errors).toEqual([]);
    });
});
