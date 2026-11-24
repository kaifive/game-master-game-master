/**
 * The game library (spec 23): every game type that's been built, with a name
 * and a one-line pitch. The admin Games page and docs/GAMES.md both come from
 * here; a test ties it to the registries (solo games and showdowns), so a
 * new game type needs an entry.
 * Choosing an event's games stays in its event file (ADR-035).
 */
export type CatalogEntry = {
  /** The id that goes in an event file's `type`. */
  type: string;
  name: string;
  /** One line, in plain words (UI_CONVENTIONS, "Game instructions"). */
  pitch: string;
  /** How it can be played: on phones, as a TV showdown, or either, chosen per event (ADR-040). */
  modes: readonly Mode[];
};

export type Mode = "solo" | "showdown";
const SOLO: readonly Mode[] = ["solo"];
const SHOWDOWN: readonly Mode[] = ["showdown"];
const BOTH: readonly Mode[] = ["solo", "showdown"];

export const CATALOG: readonly CatalogEntry[] = [
  {
    type: "trivia",
    name: "Trivia",
    pitch: "Multiple-choice questions against the clock; faster right answers score more.",
    modes: SOLO,
  },
  {
    type: "word",
    name: "Secret Word",
    pitch: "Guess a hidden 5-letter word in 6 tries, with colored tiles as clues.",
    modes: SOLO,
  },
  {
    type: "timer",
    name: "T-Timer",
    pitch: "Stop a running clock inside a tiny target window, like 1.20 to 1.25 seconds.",
    modes: SOLO,
  },
  {
    type: "taps",
    name: "Tap Masher",
    pitch: "Tap as fast as you can for a few seconds; can play a video one frame per tap.",
    modes: SOLO,
  },
  {
    type: "trail",
    name: "Pathfinder",
    pitch:
      "Draw one path through every square, hitting the numbers in order; can have a runner picture.",
    modes: SOLO,
  },
  {
    type: "stacker",
    name: "Stack Attack",
    pitch: "Tap to drop a sliding row and stack it as high as you can; overhangs get chopped.",
    modes: SOLO,
  },
  {
    type: "recall",
    name: "Rapid Recall",
    pitch: "Remember which squares lit up, over rounds that get bigger.",
    modes: SOLO,
  },
  {
    type: "color",
    name: "Color Matcher",
    pitch:
      "Match a color on a color wheel: one from memory solo, or one flashed on the TV as a showdown.",
    modes: BOTH,
  },
  {
    type: "draw",
    name: "Quick Draw",
    pitch: "Draw a shape from memory, such as a logo; a judge scores how close it is.",
    modes: SOLO,
  },
  {
    type: "slide",
    name: "Picture Slide",
    pitch: "The classic sliding tile puzzle, with numbers or a sliced-up picture.",
    modes: SOLO,
  },
  {
    type: "blocks",
    name: "Block Fit",
    pitch: "Drag and turn pieces to fill a board exactly; can rebuild a photo.",
    modes: SOLO,
  },
  {
    type: "jar",
    name: "Guessing Jar",
    pitch: "One guess at how many things are in a real jar; the host reveals the count.",
    modes: SOLO,
  },
  {
    type: "cache",
    name: "Geocache",
    pitch: "Find codes hidden around the venue and type them in for points.",
    modes: SOLO,
  },
  {
    type: "photo-challenge",
    name: "Photo Challenge",
    pitch: "Take a photo to a prompt, like Spot and Snipe; the host rates it.",
    modes: SOLO,
  },
  // Showdowns: team games on the TV, captains' phones as controllers (spec 24).
  {
    type: "flyby",
    name: "Fly-by Count",
    pitch: "Presents fly past: count them all, then only one kind, asked after they've gone.",
    modes: BOTH,
  },
  {
    type: "snowsum",
    name: "Snow Sum",
    pitch: "Snowflakes marked +3, -2 or x2 fall one at a time; keep the running total.",
    modes: BOTH,
  },
  {
    type: "blindstop",
    name: "Blind Stop",
    pitch: "stop a clock at exactly 10.00 after it hides behind a question mark.",
    modes: SHOWDOWN,
  },
  {
    type: "lastsecond",
    name: "Last Second",
    pitch: "stop a countdown as late as you dare; hit zero and you get nothing.",
    modes: SHOWDOWN,
  },
  {
    type: "auction",
    name: "Auction",
    pitch: "bid your numbers 1 to 10, each once a game; tied bids cancel, highest wins.",
    modes: SHOWDOWN,
  },
  {
    type: "stockings",
    name: "Stocking Stuffer",
    pitch: "open another stocking for points or bank them; coal loses the round's haul.",
    modes: SHOWDOWN,
  },
  {
    type: "snatch",
    name: "Share or Snatch",
    pitch: "two teams, one pot; both share and split it, one snatches and takes it all.",
    modes: SHOWDOWN,
  },
  {
    type: "path",
    name: "Memory Path",
    pitch: "a path lights up and hides; teams take turns crossing it from memory.",
    modes: SHOWDOWN,
  },
  {
    type: "shuffle",
    name: "Present Shuffle",
    pitch: "presents show their points, then shuffle; teams take turns picking one.",
    modes: SHOWDOWN,
  },
  {
    type: "to21",
    name: "Snowball to 21",
    pitch: "teams take turns adding 1, 2 or 3; whoever makes exactly 21 wins.",
    modes: SHOWDOWN,
  },
  {
    type: "landmass",
    name: "Land Mass",
    pitch: "teams take turns placing block pieces on one board; the most land wins.",
    modes: SHOWDOWN,
  },
  {
    type: "buzzer",
    name: "Buzzer Round",
    pitch:
      "The host reads a question; captains buzz when it goes green, and answer out loud in buzz order.",
    modes: SHOWDOWN,
  },
  // Perception games (spec 28): built in both modes.
  {
    type: "snowpile",
    name: "Snow Pile",
    pitch: "Snowflakes flash up for a moment; say how many. The closer, the more points.",
    modes: BOTH,
  },
  {
    type: "staffangle",
    name: "Staff Angle",
    pitch: "Turn a wushu staff to an angle like 35 degrees by eye, with no number to read.",
    modes: BOTH,
  },
  {
    type: "sleighrun",
    name: "Sleigh Run",
    pitch: "A sleigh flies into a cloud; tap where it will come out the other side.",
    modes: BOTH,
  },
  {
    type: "liondrum",
    name: "Lion Drum",
    pitch: "A lion-dance drum flashes a beat, then goes dark; keep tapping in time.",
    modes: BOTH,
  },
  {
    type: "ribbon",
    name: "Cut the Ribbon",
    pitch: "Tap where to cut a ribbon, like one third of the way along, with no marks to help.",
    modes: BOTH,
  },
];

/** The library, sorted by name, as the admin shows it. */
export const catalogByName = (): CatalogEntry[] =>
  [...CATALOG].sort((a, b) => a.name.localeCompare(b.name));

/** docs/GAMES.md, made from the catalog by `npm run games:doc` (S23-AC3). */
export function gamesDoc(): string {
  const rows = catalogByName().map(
    (g) => `| ${g.name} | \`${g.type}\` | ${g.modes.join(", ")} | ${g.pitch} |`,
  );
  return [
    "# Game library",
    "",
    "Every game type that's been built (spec 23). Made from `lib/games/catalog.ts` by",
    "`npm run games:doc`; don't edit by hand. To use a game at an event, add it to the",
    "event's file in `content/events/` with its type id.",
    "",
    'Modes: `solo` runs on players\' phones (`mode: "solo"`), `showdown` on the TV with',
    'captains\' phones (`mode: "live"`). A game with both can run either way (ADR-040).',
    "",
    "| Game | Type id | Modes | What it is |",
    "| ---- | ------- | ----- | ---------- |",
    ...rows,
    "",
  ].join("\n");
}
