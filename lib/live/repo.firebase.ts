import "server-only";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { rtdb } from "@/lib/firebase/paths";
import { EMPTY_LIVE, type LiveRepo, type LiveState } from "./repo";

const parse = (raw: unknown): LiveState => {
  if (typeof raw !== "string") return EMPTY_LIVE;
  try {
    return JSON.parse(raw) as LiveState;
  } catch {
    return EMPTY_LIVE;
  }
};

/** Live state in the Realtime Database at live/{slug}, one JSON value, changed in transactions. */
export class FirebaseLiveRepo implements LiveRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  async read(slug: string) {
    return parse((await this.admin.rtdb.ref(rtdb.live(slug)).get()).val());
  }

  async update(slug: string, change: (current: LiveState) => LiveState | null) {
    const result = await this.admin.rtdb.ref(rtdb.live(slug)).transaction((raw: unknown) => {
      const next = change(parse(raw));
      // No change: hand back what we were given rather than aborting. The first
      // run often sees an empty local cache; aborting there would never see the
      // server's value, while an unchanged write makes the database retry with it.
      return next ? JSON.stringify(next) : raw;
    });
    return parse(result.snapshot.val());
  }

  async clear(slug: string) {
    await this.admin.rtdb.ref(rtdb.live(slug)).remove();
  }
}

export const firebaseLive = () => new FirebaseLiveRepo(firebaseAdmin());
