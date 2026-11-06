/** What every game renderer gets from the game page (spec 08). */
export type GameRendererProps = {
  view: unknown;
  onMove: (move: unknown) => void;
  /** The local timer ran out: the page asks the server for the timed-out view. */
  onTimeUp: () => void;
  busy: boolean;
};

export type GameRenderer = {
  Play: (props: GameRendererProps) => React.ReactNode;
  /** A line for the result screen, such as "4 of 5 right". */
  summary: (view: unknown) => string | null;
};
