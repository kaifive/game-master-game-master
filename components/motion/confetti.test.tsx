import { globSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { fireConfetti } from "./confetti";

const confetti = vi.fn();
vi.mock("canvas-confetti", () => ({ default: confetti }));

afterEach(() => {
  confetti.mockClear();
});

describe("S14-AC9: confetti loads only when a celebration fires", () => {
  test("canvas-confetti is reached only through dynamic import()", () => {
    const users = globSync([
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ]).filter((f) => !f.includes(".test.") && readFileSync(f, "utf8").includes("canvas-confetti"));
    expect(users).toEqual(["components/motion/confetti.ts"]);
    const src = readFileSync("components/motion/confetti.ts", "utf8");
    expect(src).toMatch(/import\(["']canvas-confetti["']\)/);
    expect(src).not.toMatch(/^import .*canvas-confetti/m);
  });

  test("uses the theme's colors, and fires fewer particles on a phone than on the TV", async () => {
    window.innerWidth = 390;
    await fireConfetti({ colors: ["#b3122e", "#e5b553"] });
    window.innerWidth = 1920;
    await fireConfetti({ colors: ["#b3122e"] });
    const [phone, tv] = confetti.mock.calls.map(
      ([opts]) => opts as { particleCount: number; colors: string[] },
    );
    expect(phone!.colors).toEqual(["#b3122e", "#e5b553"]);
    expect(phone!.particleCount).toBeLessThan(tv!.particleCount);
  });

  test("never runs for people who asked for reduced motion", async () => {
    await fireConfetti({ colors: ["#fff"] });
    expect(confetti.mock.calls[0]?.[0]).toMatchObject({ disableForReducedMotion: true });
  });
});
