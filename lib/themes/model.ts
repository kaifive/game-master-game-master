import { z } from "zod";

/**
 * The style-pack contract (ADR-021, ADR-022, docs/UI_CONVENTIONS.md).
 * Every pack defines every core token for light and dark; packs may add
 * their own extra tokens (such as "snow") for their own slot components.
 */
export const COLOR_MODES = ["light", "dark"] as const;
export const ColorMode = z.enum(COLOR_MODES);
export type ColorMode = z.infer<typeof ColorMode>;

export const CORE_COLOR_TOKENS = [
  "bg",
  "surface",
  "surface-raised",
  "border",
  "text",
  "text-muted",
  "text-on-accent",
  "accent",
  "accent-hover",
  "success",
  "warning",
  "danger",
  "tile-correct",
  "tile-correct-ink",
  "tile-present",
  "tile-present-ink",
  "tile-absent",
  "tile-absent-ink",
  "tile-empty",
  "buzzer",
  "buzzer-ink",
  "buzzer-locked",
  "team-1",
  "team-2",
  "team-3",
  "team-4",
  "team-5",
  "team-6",
  "team-7",
  "team-8",
] as const;

export const CORE_OTHER_TOKENS = ["radius", "font-display", "font-body"] as const;
export const CORE_TOKENS = [...CORE_COLOR_TOKENS, ...CORE_OTHER_TOKENS] as const;
export type CoreToken = (typeof CORE_TOKENS)[number];

/** Token values by name: the core tokens plus any extras a pack adds. */
export const TokenSet = z.record(z.string(), z.string());
export type TokenSet = z.infer<typeof TokenSet>;

/** A pair of tokens whose text must stay readable on its background. */
export const ContrastPair = z.object({
  fg: z.string(),
  bg: z.string(),
  min: z.number(),
});
export type ContrastPair = z.infer<typeof ContrastPair>;

const NORMAL = 4.5;
const LARGE = 3; // game letters, scores and buzzer labels are large, bold text

/** Pairs every pack must pass (S09-AC6). Packs add pairs for their extras. */
export const CONTRAST_PAIRS: ContrastPair[] = [
  { fg: "text", bg: "bg", min: NORMAL },
  { fg: "text-muted", bg: "bg", min: NORMAL },
  { fg: "text", bg: "surface", min: NORMAL },
  { fg: "text-muted", bg: "surface", min: NORMAL },
  { fg: "text", bg: "surface-raised", min: NORMAL },
  { fg: "text-on-accent", bg: "accent", min: NORMAL },
  { fg: "tile-correct-ink", bg: "tile-correct", min: LARGE },
  { fg: "tile-present-ink", bg: "tile-present", min: LARGE },
  { fg: "tile-absent-ink", bg: "tile-absent", min: LARGE },
  { fg: "buzzer-ink", bg: "buzzer", min: LARGE },
];

/** A variant only changes tokens, icons and decorations (S09-AC5). */
export const VariantDefinition = z
  .object({
    name: z.string().optional(),
    tokens: z.object({ light: TokenSet.optional(), dark: TokenSet.optional() }).strict().optional(),
    icons: z.record(z.string(), z.string()).optional(),
    decorations: z.array(z.string()).optional(),
  })
  .strict();
export type VariantDefinition = z.infer<typeof VariantDefinition>;

export const PackDefinition = z
  .object({
    id: z.string(),
    name: z.string(),
    tokens: z.object({ light: TokenSet, dark: TokenSet }).strict(),
    decorations: z.array(z.string()).optional(),
    contrastPairs: z.array(ContrastPair).optional(),
    variants: z.record(z.string(), VariantDefinition),
  })
  .strict();
export type PackDefinition = z.infer<typeof PackDefinition>;

/** What an event's config says about its look. */
export const StyleRef = z.object({
  pack: z.string(),
  variant: z.string().optional(),
  colorMode: ColorMode,
});
export type StyleRef = z.infer<typeof StyleRef>;

/** The look on screen: a pack, a variant and a color mode, resolved. */
export type Theme = {
  pack: string;
  variant: string | undefined;
  mode: ColorMode;
  tokens: TokenSet;
  icons: Record<string, string>;
  decorations: string[];
};
