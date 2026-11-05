import type { EventRuntimeRepo } from "./repo";
import { eventStatus, parseLeaderboard } from "./rules";

/** In-memory runtime facts: for tests, and local runs without Firebase. */
export class MemoryEventRuntimeRepo implements EventRuntimeRepo {
  constructor(
    private readonly statuses: Record<string, string> = {},
    private readonly leaderboards: Record<string, unknown> = {},
  ) {}

  status(slug: string) {
    return Promise.resolve(eventStatus(this.statuses[slug]));
  }

  finalStandings(slug: string) {
    return Promise.resolve(parseLeaderboard(this.leaderboards[slug]));
  }
}
