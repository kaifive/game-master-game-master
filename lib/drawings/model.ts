/** A kept drawing (ADR-032): one finished run of a game with `keepDrawings`. */
export type DrawingRecord = {
  id: string;
  gameId: string;
  playerId: string;
  /** Which run of the player's play it came from. */
  run: number;
  /** What the run scored. */
  points: number;
  /** The SVG in Blob (a data URL in the memory backend). */
  url: string;
  createdAt: number;
};

/** A stroke: points as shares of the canvas, 0 to 1. */
export type Stroke = [number, number][];
