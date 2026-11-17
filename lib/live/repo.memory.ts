import { EMPTY_LIVE, normalizeLive, type LiveRepo, type LiveState } from "./repo";

/** Live state in memory: dev, tests and the e2e server (S11-AC8). Updates run one at a time. */
export class MemoryLiveRepo implements LiveRepo {
  private readonly states = new Map<string, string>();
  private queue: Promise<unknown> = Promise.resolve();

  read(slug: string): Promise<LiveState> {
    const raw = this.states.get(slug);
    return Promise.resolve(raw ? normalizeLive(JSON.parse(raw)) : EMPTY_LIVE);
  }

  update(slug: string, change: (current: LiveState) => LiveState | null): Promise<LiveState> {
    // Like a database transaction: each change sees the one before it.
    const run = this.queue.then(async () => {
      const next = change(await this.read(slug));
      if (next) this.states.set(slug, JSON.stringify(next));
      return this.read(slug);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  clear(slug: string): Promise<void> {
    this.states.delete(slug);
    return Promise.resolve();
  }
}
