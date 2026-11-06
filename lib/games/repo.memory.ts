import type { PlayChange, PlayRecord, PlayRepo } from "./repo";

const key = (slug: string, gameId: string, playerId: string) => `${slug}/${gameId}_${playerId}`;

/** In-memory plays: for tests, and local runs without Firebase. */
export class MemoryPlayRepo implements PlayRepo {
  private readonly plays = new Map<string, PlayRecord>();
  // Changes to one play run one at a time, like a Firestore transaction.
  private queue: Promise<unknown> = Promise.resolve();

  get(slug: string, gameId: string, playerId: string) {
    return Promise.resolve(this.plays.get(key(slug, gameId, playerId)) ?? null);
  }

  forPlayer(slug: string, playerId: string) {
    return Promise.resolve(
      [...this.plays.entries()]
        .filter(([k, p]) => k.startsWith(`${slug}/`) && p.playerId === playerId)
        .map(([, p]) => p),
    );
  }

  update(slug: string, gameId: string, playerId: string, change: PlayChange) {
    const run = this.queue.then(() => {
      const k = key(slug, gameId, playerId);
      const current = this.plays.get(k) ?? null;
      const next = change(current ? structuredClone(current) : null);
      if (!next) return current;
      this.plays.set(k, structuredClone(next));
      return next;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}
