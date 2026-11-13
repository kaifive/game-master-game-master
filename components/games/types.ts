import type { PlayResponse } from "@/lib/games";

/** What every game renderer gets from the game page (spec 08). */
export type GameRendererProps = {
  view: unknown;
  /** `notBefore` (epoch ms): hold the reply until then, so a request can go out early (S10-AC14). */
  onMove: (move: unknown, options?: { notBefore?: number }) => void;
  /** The local timer ran out: the page asks the server for the timed-out view. */
  onTimeUp: () => void;
  busy: boolean;
  /** The game's id, for games that send more than moves (photos, spec 20). */
  gameId?: string;
  /** Shows a play the server returned outside a move, such as after a photo upload. */
  onPlay?: (play: PlayResponse) => void;
};

export type GameRenderer = {
  Play: (props: GameRendererProps) => React.ReactNode;
  /** A line for the result screen, such as "4 of 5 right". */
  summary: (view: unknown) => string | null;
  /** A clock runs on the server mid-run, so leaving costs time: ask first (S08-AC14). */
  warnOnLeave?: boolean;
};
