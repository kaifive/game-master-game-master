import { describe, expect, test } from "vitest";
import { ADMIN_THEME } from "./admin";
import { CONTRAST_PAIRS, CORE_TOKENS, PackDefinition, VariantDefinition } from "./model";
import { PACKS } from "./packs";
import {
  checkContrast,
  contrastRatio,
  missingTokens,
  resolveTheme,
  toCssVars,
  validateStyleRef,
} from "./rules";

const allPacks = Object.values(PACKS);
const combos = allPacks.flatMap((pack) =>
  [undefined, ...Object.keys(pack.variants)].flatMap((variant) =>
    (["light", "dark"] as const).map((mode) => ({ pack, variant, mode })),
  ),
);

describe("S09-AC1: style references in event config are validated", () => {
  test("accepts a known pack, variant and color mode", () => {
    expect(
      validateStyleRef({ pack: "judges-table", variant: "winter", colorMode: "dark" }),
    ).toEqual({
      ok: true,
    });
    expect(validateStyleRef({ pack: "judges-table", colorMode: "light" })).toEqual({ ok: true });
  });

  test("names the unknown pack", () => {
    const r = validateStyleRef({ pack: "judge-table", colorMode: "dark" });
    expect(r).toEqual({ ok: false, error: expect.stringContaining('"judge-table"') as string });
  });

  test("names the unknown variant and the pack it was looked for in", () => {
    const r = validateStyleRef({ pack: "judges-table", variant: "summer", colorMode: "dark" });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/"summer".*judges-table/);
  });

  test("names a bad color mode", () => {
    const r = validateStyleRef({ pack: "judges-table", colorMode: "dim" });
    expect(!r.ok && r.error).toMatch(/"dim"/);
  });

  test("rejects a shape that isn't a style reference", () => {
    expect(validateStyleRef("judges-table").ok).toBe(false);
  });
});

describe("S09-AC4: every pack defines every contract token in light and dark", () => {
  test.each(
    allPacks.flatMap((p) => (["light", "dark"] as const).map((m) => [p.id, m, p] as const)),
  )("%s (%s) has no missing tokens", (_id, mode, pack) => {
    expect(missingTokens(pack.tokens[mode])).toEqual([]);
  });

  test("a missing token is reported by name", () => {
    const rest = Object.fromEntries(
      Object.entries(PACKS["judges-table"]!.tokens.light).filter(([k]) => k !== "bg"),
    );
    expect(missingTokens(rest)).toEqual(["bg"]);
  });

  test("the admin theme defines every contract token too", () => {
    expect(missingTokens(ADMIN_THEME.light)).toEqual([]);
    expect(missingTokens(ADMIN_THEME.dark)).toEqual([]);
  });
});

describe("S09-AC5: variants only change tokens, icons and decorations", () => {
  test("a variant with anything else is rejected", () => {
    expect(VariantDefinition.safeParse({ tokens: {}, components: {} }).success).toBe(false);
    expect(
      VariantDefinition.safeParse({ tokens: {}, icons: {}, decorations: ["snow"] }).success,
    ).toBe(true);
  });

  test("every pack definition, variants included, matches the contract", () => {
    for (const pack of allPacks) expect(PackDefinition.safeParse(pack).success).toBe(true);
  });

  test.each(combos.map((c) => [c.pack.id, c.variant ?? "base", c.mode, c] as const))(
    "%s / %s / %s resolves to a complete token set",
    (_p, _v, _m, { pack, variant, mode }) => {
      const theme = resolveTheme(pack, variant, mode);
      expect(missingTokens(theme.tokens)).toEqual([]);
    },
  );

  test("the variant's tokens win over the pack's, and the rest are kept", () => {
    const base = resolveTheme(PACKS["judges-table"]!, undefined, "light");
    const winter = resolveTheme(PACKS["judges-table"]!, "winter", "light");
    expect(winter.tokens.bg).not.toBe(base.tokens.bg);
    expect(winter.tokens["font-display"]).toBe(base.tokens["font-display"]);
    expect(winter.decorations).toContain("snow");
    expect(base.decorations).not.toContain("snow");
  });
});

describe("S09-AC6: text contrast in every pack, variant and mode", () => {
  test("contrastRatio follows WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });

  test("checkContrast reports the failing pair", () => {
    const tokens = { ...PACKS["judges-table"]!.tokens.light, text: "#eeeeee" };
    expect(checkContrast(tokens, CONTRAST_PAIRS).map((f) => f.fg)).toContain("text");
  });

  test.each(combos.map((c) => [c.pack.id, c.variant ?? "base", c.mode, c] as const))(
    "%s / %s / %s passes",
    (_p, _v, _m, { pack, variant, mode }) => {
      const theme = resolveTheme(pack, variant, mode);
      expect(
        checkContrast(theme.tokens, [...CONTRAST_PAIRS, ...(pack.contrastPairs ?? [])]),
      ).toEqual([]);
    },
  );

  test.each(["light", "dark"] as const)("the admin theme passes (%s)", (mode) => {
    expect(checkContrast(ADMIN_THEME[mode], CONTRAST_PAIRS)).toEqual([]);
  });
});

describe("toCssVars", () => {
  test("turns tokens into --gm- custom properties", () => {
    expect(toCssVars({ bg: "#fff", "tile-correct": "#0f0" })).toEqual({
      "--gm-bg": "#fff",
      "--gm-tile-correct": "#0f0",
    });
  });

  test("covers every contract token", () => {
    expect(CORE_TOKENS.length).toBeGreaterThan(20);
  });
});
