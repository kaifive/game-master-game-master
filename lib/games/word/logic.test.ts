import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isWord, WORD_COUNT } from "./dictionary";
import { marksFor, word, wordShare, WordContent } from "./logic";

const c = WordContent.parse({ answers: ["spear", "horse", "taolu"] });
const at = { now: 0, isWord };
const guess = (s: ReturnType<typeof word.create>, w: string, ctx = at) => {
  const r = word.move(s, c, { type: "guess", word: w }, ctx);
  if (!r.ok) throw new Error(r.message);
  return r.state;
};

describe("Secret Word", () => {
  it("S19-AC1: answers are five-letter words; each play draws one from its seed", () => {
    expect(WordContent.safeParse({ answers: ["spears"] }).success).toBe(false);
    expect(WordContent.safeParse({ answers: [] }).success).toBe(false);
    expect(c.answers).toEqual(["SPEAR", "HORSE", "TAOLU"]);
    const drawn = new Set(Array.from({ length: 40 }, (_, seed) => word.create(c, seed, at).answer));
    expect(drawn).toEqual(new Set(["SPEAR", "HORSE", "TAOLU"]));
    expect(word.create(c, 7, at).answer).toBe(word.create(c, 7, at).answer);
  });

  it("S19-AC2: a guess must be five letters and a real word or an answer; anything else doesn't use a try", () => {
    expect(WORD_COUNT).toBe(12_578);
    expect(isWord("crane")).toBe(true);
    expect(isWord("XQZVB")).toBe(false);
    const s = { ...word.create(c, 1, at), answer: "SPEAR" };
    expect(word.move(s, c, { type: "guess", word: "spea" }, at).ok).toBe(false);
    expect(word.move(s, c, { type: "guess", word: "sp3ar" }, at).ok).toBe(false);
    const turned = guess(s, "xqzvb");
    expect(turned.guesses).toEqual([]);
    expect(word.view(turned, c, at)).toMatchObject({ kind: "guessing", rejected: "XQZVB" });
    // An answer that isn't a dictionary word can still be guessed.
    expect(guess(s, "taolu").guesses).toEqual(["TAOLU"]);
    expect(guess(turned, "crane").rejected).toBeNull();
  });

  it("S19-AC3: marks right spots first, then present letters as often as the answer holds them", () => {
    expect(marksFor("CRANE", "SPEAR")).toEqual([
      "absent",
      "present",
      "present",
      "absent",
      "present",
    ]);
    expect(marksFor("SPEAR", "SPEAR")).toEqual(Array(5).fill("correct"));
    // Two Es guessed, one in the answer: only one is marked.
    expect(marksFor("EERIE", "HORSE")).toEqual([
      "absent",
      "absent",
      "correct",
      "absent",
      "correct",
    ]);
    expect(marksFor("GEESE", "SPEAR")).toEqual([
      "absent",
      "absent",
      "correct",
      "present",
      "absent",
    ]);
    expect(marksFor("SASSY", "SPEAR")).toEqual([
      "correct",
      "present",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("S19-AC4: points by guesses; a replayable event never shows an unsolved answer", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => wordShare(n, true))).toEqual([1, 1, 0.9, 0.75, 0.6, 0.45]);
    expect(wordShare(6, false)).toBe(0);
    let s = { ...word.create(c, 1, at), answer: "SPEAR" };
    s = guess(s, "crane");
    s = guess(s, "spear");
    expect(word.isOver(s)).toBe(true);
    expect(word.score(s, 100)).toBe(100);
    expect(word.view(s, c, { now: 0, replayable: true })).toMatchObject({
      kind: "done",
      solved: true,
      answer: "SPEAR",
    });
    let lost = { ...word.create(c, 1, at), answer: "SPEAR" };
    for (const w of ["crane", "horse", "lotus", "punch", "block", "sweep"]) lost = guess(lost, w);
    expect(word.isOver(lost)).toBe(true);
    expect(word.score(lost, 100)).toBe(0);
    expect(word.view(lost, c, { now: 0, replayable: true })).toMatchObject({
      solved: false,
      answer: null,
    });
    expect(word.view(lost, c, { now: 0 })).toMatchObject({ answer: "SPEAR" });
    expect(word.move(lost, c, { type: "guess", word: "spear" }, at).ok).toBe(false);
  });

  it("S19-AC5: the instructions say nothing about the theme", () => {
    const text = word.instructions(c).lines.join(" ").toLowerCase();
    expect(text).toMatch(/5-letter word in 6 tries/);
    expect(text).not.toMatch(/wushu|martial|kung/);
  });
});
