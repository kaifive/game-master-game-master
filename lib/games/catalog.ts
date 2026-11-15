/**
 * The game library (spec 23): every game type that's been built, with a name
 * and a one-line pitch. The admin Games page and docs/GAMES.md both come from
 * here; a test ties it to the registry, so a new game type needs an entry.
 * Choosing an event's games stays in its event file (ADR-035).
 */
export type CatalogEntry = {
  /** The id that goes in an event file's `type`. */
  type: string;
  name: string;
  /** One line, in plain words (UI_CONVENTIONS, "Game instructions"). */
  pitch: string;
};

export const CATALOG: readonly CatalogEntry[] = [
  {
    type: "trivia",
    name: "Trivia",
    pitch: "Multiple-choice questions against the clock; faster right answers score more.",
  },
  {
    type: "word",
    name: "Secret Word",
    pitch: "Guess a hidden 5-letter word in 6 tries, with colored tiles as clues.",
  },
  {
    type: "timer",
    name: "T-Timer",
    pitch: "Stop a running clock inside a tiny target window, like 1.20 to 1.25 seconds.",
  },
  {
    type: "taps",
    name: "Tap Masher",
    pitch: "Tap as fast as you can for a few seconds; can play a video one frame per tap.",
  },
  {
    type: "trail",
    name: "Pathfinder",
    pitch:
      "Draw one path through every square, hitting the numbers in order; can have a runner picture.",
  },
  {
    type: "stacker",
    name: "Stack Attack",
    pitch: "Tap to drop a sliding row and stack it as high as you can; overhangs get chopped.",
  },
  {
    type: "recall",
    name: "Rapid Recall",
    pitch: "Remember which squares lit up, over rounds that get bigger.",
  },
  {
    type: "color",
    name: "Color Matcher",
    pitch: "Pick a color from memory on a color wheel; the closer, the more points.",
  },
  {
    type: "draw",
    name: "Quick Draw",
    pitch: "Draw a shape from memory, such as a logo; a judge scores how close it is.",
  },
  {
    type: "slide",
    name: "Picture Slide",
    pitch: "The classic sliding tile puzzle, with numbers or a sliced-up picture.",
  },
  {
    type: "blocks",
    name: "Block Fit",
    pitch: "Drag and turn pieces to fill a board exactly; can rebuild a photo.",
  },
  {
    type: "jar",
    name: "Guessing Jar",
    pitch: "One guess at how many things are in a real jar; the host reveals the count.",
  },
  {
    type: "cache",
    name: "Geocache",
    pitch: "Find codes hidden around the venue and type them in for points.",
  },
  {
    type: "photo-challenge",
    name: "Photo Challenge",
    pitch: "Take a photo to a prompt, like Spot and Snipe; the host rates it.",
  },
];

/** The library, sorted by name, as the admin shows it. */
export const catalogByName = (): CatalogEntry[] =>
  [...CATALOG].sort((a, b) => a.name.localeCompare(b.name));

/** docs/GAMES.md, made from the catalog by `npm run games:doc` (S23-AC3). */
export function gamesDoc(): string {
  const rows = catalogByName().map((g) => `| ${g.name} | \`${g.type}\` | ${g.pitch} |`);
  return [
    "# Game library",
    "",
    "Every game type that's been built (spec 23). Made from `lib/games/catalog.ts` by",
    "`npm run games:doc`; don't edit by hand. To use a game at an event, add it to the",
    "event's file in `content/events/` with its type id.",
    "",
    "| Game | Type id | What it is |",
    "| ---- | ------- | ---------- |",
    ...rows,
    "",
  ].join("\n");
}
