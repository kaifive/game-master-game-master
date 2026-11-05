import {
  COLOR_MODES,
  CORE_TOKENS,
  type ColorMode,
  type ContrastPair,
  type PackDefinition,
  type Theme,
  type TokenSet,
} from "./model";
import { PACKS } from "./packs";

export type Validation = { ok: true } | { ok: false; error: string };

/** Checks an event's style against the known packs (S09-AC1). */
export function validateStyleRef(
  value: unknown,
  packs: Record<string, PackDefinition> = PACKS,
): Validation {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "The style must be an object with pack and colorMode." };
  }
  const { pack, variant, colorMode } = value as Record<string, unknown>;
  const def = typeof pack === "string" ? packs[pack] : undefined;
  if (!def) {
    const known = Object.keys(packs).join(", ");
    return {
      ok: false,
      error: `Unknown style pack ${JSON.stringify(pack)}. Known packs: ${known}.`,
    };
  }
  if (variant !== undefined && (typeof variant !== "string" || !(variant in def.variants))) {
    const known = Object.keys(def.variants).join(", ") || "none";
    return {
      ok: false,
      error: `Unknown variant ${JSON.stringify(variant)} for pack ${def.id}. Its variants: ${known}.`,
    };
  }
  if (!COLOR_MODES.includes(colorMode as ColorMode)) {
    return {
      ok: false,
      error: `Unknown color mode ${JSON.stringify(colorMode)}. Use "light" or "dark".`,
    };
  }
  return { ok: true };
}

/** Pack tokens, then the variant's overrides, for one color mode. */
export function resolveTheme(
  pack: PackDefinition,
  variant: string | undefined,
  mode: ColorMode,
): Theme {
  const v = variant ? pack.variants[variant] : undefined;
  return {
    pack: pack.id,
    variant,
    mode,
    tokens: { ...pack.tokens[mode], ...(v?.tokens?.[mode] ?? {}) },
    icons: { ...(v?.icons ?? {}) },
    decorations: [...(pack.decorations ?? []), ...(v?.decorations ?? [])],
  };
}

export const missingTokens = (tokens: TokenSet): string[] =>
  CORE_TOKENS.filter((name) => !(name in tokens));

function luminance(hex: string): number {
  const n = /^#([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!n) throw new Error(`Contrast needs a #rrggbb color, got ${JSON.stringify(hex)}`);
  const channel = (i: number) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** WCAG 2 contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on a #rrggbb background. */
export const readableInk = (bg: string): string =>
  contrastRatio("#111111", bg) >= contrastRatio("#ffffff", bg) ? "#111111" : "#ffffff";

export type ContrastFailure = ContrastPair & { ratio: number };

export function checkContrast(tokens: TokenSet, pairs: ContrastPair[]): ContrastFailure[] {
  return pairs.flatMap((pair) => {
    const fg = tokens[pair.fg];
    const bg = tokens[pair.bg];
    if (!fg || !bg) return [{ ...pair, ratio: 0 }];
    const ratio = contrastRatio(fg, bg);
    return ratio >= pair.min ? [] : [{ ...pair, ratio: Math.round(ratio * 100) / 100 }];
  });
}

/** Tokens as CSS custom properties: bg becomes --gm-bg. */
export const toCssVars = (tokens: TokenSet): Record<string, string> =>
  Object.fromEntries(Object.entries(tokens).map(([k, v]) => [`--gm-${k}`, v]));
