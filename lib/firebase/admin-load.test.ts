import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Vercel's Node can't require() ES modules, so every server dependency must
// load without that feature (ADR-025).
describe("firebase-admin on the server runtime", () => {
  it.each([
    "firebase-admin/app",
    "firebase-admin/auth",
    "firebase-admin/firestore",
    "firebase-admin/database",
  ])("%s loads without require(esm)", (mod) => {
    const out = execFileSync(
      process.execPath,
      [
        "--no-experimental-require-module",
        "-e",
        `require(${JSON.stringify(mod)}); process.stdout.write("ok")`,
      ],
      { encoding: "utf8" },
    );
    expect(out).toBe("ok");
  });
});
