import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, taps, TapsContent } from "./logic";

const c = TapsContent.parse({});
const at = (now: number) => ({ now });

describe("Tap Masher", () => {
  it("S16-AC1: defaults to 5 seconds; the instructions don't give away the top score", () => {
    const lines = taps.instructions(c).lines.join(" ");
    expect(lines).toMatch(/5 seconds/);
    expect(lines).not.toMatch(/50/);
  });

  it("S16-AC3: the countdown starts with the game; 50 taps scores all, and the impossible is refused", () => {
    const s = taps.create(c, 1, at(0));
    expect(taps.view(s, c, at(1000))).toMatchObject({
      kind: "running",
      goInMs: COUNTDOWN_MS - 1000,
    });
    expect(taps.move(s, c, { type: "finish", taps: 20 }, at(4000)).ok).toBe(false); // too early
    expect(taps.move(s, c, { type: "finish", taps: 101 }, at(8000)).ok).toBe(false); // > 20/s
    const done = taps.move(s, c, { type: "finish", taps: 30 }, at(8000));
    if (!done.ok) throw new Error(done.message);
    expect(taps.score(done.state, 100)).toBe(60);
    const max = taps.move(s, c, { type: "finish", taps: 70 }, at(8000));
    if (!max.ok) throw new Error(max.message);
    expect(taps.score(max.state, 100)).toBe(100);
    expect(taps.isOver(taps.tick(s, c, at(60_000)))).toBe(true);
  });
});

describe("Tap Masher with a film", () => {
  const film = {
    sheet: "/form.jpg",
    frames: 50,
    columns: 10,
    width: 320,
    height: 240,
    alt: "Coach's spear form",
  };
  const f = TapsContent.parse({ seconds: 5, film });

  it("S16-AC8: the frames are the target; the phone gets the film; finishing every frame ends the run early", () => {
    const lines = taps.instructions(f).lines;
    expect(lines[0]).toBe("Help Coach finish the form!");
    expect(lines.join(" ")).toMatch(/every tap plays the next move/);
    const s = taps.create(f, 1, at(0));
    expect(s.target).toBe(50);
    expect(taps.view(s, f, at(0))).toMatchObject({ kind: "running", film });
    // All 50 frames at 20 a second takes 2.5 s: any sooner isn't a person.
    expect(taps.move(s, f, { type: "finish", taps: 50 }, at(COUNTDOWN_MS + 1000)).ok).toBe(false);
    // Fewer than all of them must still wait for the clock.
    expect(taps.move(s, f, { type: "finish", taps: 49 }, at(COUNTDOWN_MS + 2600)).ok).toBe(false);
    const early = taps.move(s, f, { type: "finish", taps: 50 }, at(COUNTDOWN_MS + 2600));
    if (!early.ok) throw new Error(early.message);
    expect(taps.score(early.state, 100)).toBe(100);
    expect(taps.view(early.state, f, at(0))).toMatchObject({ kind: "done", taps: 50, film });
    // A film can't need more taps than the seconds allow.
    expect(TapsContent.safeParse({ seconds: 2, film }).success).toBe(false);
  });
});
