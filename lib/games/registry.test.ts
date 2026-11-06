import { describe, expect, it } from "vitest";
import { contentErrors, gameLogic } from "./registry";

describe("game registry", () => {
  it("knows trivia, and nothing yet for types built later", () => {
    expect(gameLogic("trivia")).toBeDefined();
    expect(gameLogic("jeopardy")).toBeUndefined();
  });

  it("S08-AC1: reports content problems by path", () => {
    expect(contentErrors("trivia", { questions: [] })).toEqual([
      expect.stringMatching(/^questions: /),
    ]);
    expect(contentErrors("jeopardy", { anything: true })).toEqual([]);
  });
});
