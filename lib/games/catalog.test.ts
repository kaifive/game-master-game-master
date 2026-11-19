import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG, catalogByName, gamesDoc } from "./catalog";
import { showdownTypes } from "@/lib/live";
import { builtGameTypes } from "./registry";

describe("game library (spec 23)", () => {
  it("S23-AC1: every built game type has an entry with a name and a one-line pitch, and every entry is built", () => {
    expect(CATALOG.map((g) => g.type).sort()).toEqual(
      [...new Set([...builtGameTypes(), ...showdownTypes()])].sort(),
    );
    for (const g of CATALOG) {
      expect(g.name.trim()).not.toBe("");
      expect(g.pitch.trim()).not.toBe("");
      expect(g.pitch).not.toMatch(/\n/);
    }
    expect(new Set(CATALOG.map((g) => g.name)).size).toBe(CATALOG.length);
    const names = catalogByName().map((g) => g.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("S28-AC6: each entry's modes match what's built: solo in the game registry, showdown in the live one", () => {
    for (const g of CATALOG) {
      expect(g.modes.includes("solo")).toBe(builtGameTypes().includes(g.type));
      expect(g.modes.includes("showdown")).toBe(showdownTypes().includes(g.type));
    }
    for (const type of ["snowpile", "staffangle", "sleighrun", "liondrum", "ribbon"])
      expect(CATALOG.find((g) => g.type === type)?.modes).toEqual(["solo", "showdown"]);
  });

  it("S23-AC3: docs/GAMES.md matches the catalog (run npm run games:doc after changing it)", () => {
    expect(readFileSync("docs/GAMES.md", "utf8")).toBe(gamesDoc());
  });
});
