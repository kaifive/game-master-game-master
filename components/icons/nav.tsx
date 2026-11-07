/** The party's tab icons: one stroke, drawn to match (not emoji). */
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** A score card on its handle: the games. */
export const GamesIcon = () => (
  <svg {...base}>
    <rect x="5" y="3" width="14" height="11" rx="1.5" />
    <path d="M12 14v7" />
    <path d="M9.5 8.5h5" />
  </svg>
);

/** A podium: the leaderboard. */
export const BoardIcon = () => (
  <svg {...base}>
    <path d="M9 20V8h6v12" />
    <path d="M3 20v-7h6" />
    <path d="M15 20v-5h6v5" />
    <path d="M2 20h20" />
  </svg>
);

/** Two people: your team. */
export const TeamIcon = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 14.2c2.9.4 5 2.8 5 5.8" />
  </svg>
);

/** One person: you. */
export const YouIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20.5c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
);

/** The way back to the games, in the header. */
export const BackIcon = () => (
  <svg {...base} strokeWidth={2.6}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/** An onward arrow, after a row's action ("Play", "Again"). */
export const ArrowIcon = () => (
  <svg {...base} width={18} height={18} strokeWidth={2.4}>
    <path d="M5 12h13" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);
