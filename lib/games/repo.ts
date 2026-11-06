export type PlayStatus = "playing" | "finished";

/** One player's run at one game (spec 08). The server owns `state`. */
export type PlayRecord = {
  gameId: string;
  playerId: string;
  deviceUid: string;
  seed: number;
  state: unknown;
  status: PlayStatus;
  /** This run's points; fixed when it ends. */
  points: number;
  /** The best finished run: the player's score for this game (S08-AC12). */
  best: number;
  /** How many runs have started. */
  runs: number;
  /** At least one run has finished. */
  scored: boolean;
};

/** A change to a play: the new record, or null to leave it as it is. May throw. */
export type PlayChange = (current: PlayRecord | null) => PlayRecord | null;

export interface PlayRepo {
  get(slug: string, gameId: string, playerId: string): Promise<PlayRecord | null>;
  forPlayer(slug: string, playerId: string): Promise<PlayRecord[]>;
  /** Read, change and write one play atomically; returns what is stored afterwards. */
  update(
    slug: string,
    gameId: string,
    playerId: string,
    change: PlayChange,
  ): Promise<PlayRecord | null>;
}
