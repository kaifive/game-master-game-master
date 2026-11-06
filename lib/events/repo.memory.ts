import type { EventRuntimeRepo } from "./repo";
import { eventStatus, parseLeaderboard } from "./rules";

/** In-memory runtime facts: for tests, and local runs without Firebase. */
export class MemoryEventRuntimeRepo implements EventRuntimeRepo {
  constructor(
    private readonly statuses: Record<string, string> = {},
    private readonly leaderboards: Record<string, unknown> = {},
    /** A status for every event, such as a test's cookie. Wins over `statuses`. */
    private readonly override: () => Promise<string | undefined> = () => Promise.resolve(undefined),
  ) {}

  setStatus(slug: string, status: string) {
    this.statuses[slug] = status;
    return Promise.resolve();
  }

  async status(slug: string) {
    return eventStatus((await this.override()) ?? this.statuses[slug]);
  }

  finalStandings(slug: string) {
    return Promise.resolve(parseLeaderboard(this.leaderboards[slug]));
  }
}
