import { EMPTY_GUESTS, normalizeGuests, type GuestList } from "./model";
import type { GuestRepo } from "./repo";

/** The guest list in memory: dev, tests and the e2e server. Updates run one at a time. */
export class MemoryGuestRepo implements GuestRepo {
  private readonly lists = new Map<string, string>();
  private queue: Promise<unknown> = Promise.resolve();

  read(slug: string): Promise<GuestList> {
    const raw = this.lists.get(slug);
    return Promise.resolve(raw ? normalizeGuests(JSON.parse(raw)) : EMPTY_GUESTS);
  }

  update(slug: string, change: (current: GuestList) => GuestList | null): Promise<GuestList> {
    // Like a database transaction: each change sees the one before it (S32-AC6).
    const run = this.queue.then(async () => {
      const next = change(await this.read(slug));
      if (next) this.lists.set(slug, JSON.stringify(next));
      return this.read(slug);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  clear(slug: string): Promise<void> {
    this.lists.delete(slug);
    return Promise.resolve();
  }
}
