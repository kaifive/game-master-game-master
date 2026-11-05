import { globSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { PACKS } from "@/lib/themes";

/**
 * S09-AC9, statically: pack components are only reachable through dynamic
 * import() in the pack loader, so a page bundles only the pack it loads.
 * (The /dev/ui gallery is exempt: it shows every pack on purpose.)
 */
const packIds = Object.keys(PACKS);
const source = (f: string) => readFileSync(f, "utf8");
const files = globSync([
  "app/**/*.{ts,tsx}",
  "components/**/*.{ts,tsx}",
  "lib/**/*.{ts,tsx}",
]).filter((f) => !f.includes(".test.") && !f.startsWith("app/dev/") && !f.includes("/contracts/"));

describe("S09-AC9: an event page never loads another pack's components or fonts", () => {
  test("the pack data registry imports no pack components", () => {
    expect(source("lib/themes/packs/index.ts")).not.toMatch(/\/(slots|root)["']/);
  });

  test("the loader reaches every pack only through dynamic import()", () => {
    const loader = source("components/packs/loaders.ts");
    for (const id of packIds) {
      expect(loader).toMatch(new RegExp(`import\\(["']\\./${id}/root["']\\)`));
    }
    expect(loader).not.toMatch(/^import .*\/(slots|root)["']/m);
  });

  test.each(packIds)("only %s's own folder imports its components and fonts", (id) => {
    const outsiders = files.filter(
      (f) =>
        !f.startsWith(`components/packs/${id}/`) &&
        f !== "components/packs/loaders.ts" &&
        (new RegExp(`packs/${id}/(slots|root)`).test(source(f)) ||
          /@fontsource\/oswald/.test(source(f))),
    );
    expect(outsiders).toEqual([]);
  });
});
