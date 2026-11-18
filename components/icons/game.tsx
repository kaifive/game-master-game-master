/** Game marks, drawn one-stroke to match the tab icons (not text glyphs). */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Done: locked in, played, right. */
export const CheckIcon = ({ size = 18 }: { size?: number }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

/** Moved up the standings. */
export const RiseIcon = ({ size = 18 }: { size?: number }) => (
  <svg {...base} width={size} height={size}>
    <path d="M5 15l7-7 7 7" />
  </svg>
);

/** Rub out the last digit. */
export const BackspaceIcon = ({ size = 26 }: { size?: number }) => (
  <svg {...base} width={size} height={size} strokeWidth={2.2}>
    <path d="M9 5h11v14H9l-6-7z" />
    <path d="M12.5 9.5l5 5M17.5 9.5l-5 5" />
  </svg>
);
