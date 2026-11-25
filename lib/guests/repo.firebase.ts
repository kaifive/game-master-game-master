import "server-only";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { rtdb } from "@/lib/firebase/paths";
import { EMPTY_GUESTS, normalizeGuests, type GuestList } from "./model";
import type { GuestRepo } from "./repo";

const parse = (raw: unknown): GuestList => {
  if (typeof raw !== "string") return EMPTY_GUESTS;
  try {
    return normalizeGuests(JSON.parse(raw));
  } catch {
    return EMPTY_GUESTS;
  }
};

/** The guest list at guests/{slug} in the Realtime Database: one JSON value, changed in transactions (ADR-047). */
export class FirebaseGuestRepo implements GuestRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  async read(slug: string) {
    return parse((await this.admin.rtdb.ref(rtdb.guests(slug)).get()).val());
  }

  async update(slug: string, change: (current: GuestList) => GuestList | null) {
    const result = await this.admin.rtdb.ref(rtdb.guests(slug)).transaction((raw: unknown) => {
      const next = change(parse(raw));
      // Unchanged: hand back what we were given, so the database retries with its own value.
      return next ? JSON.stringify(next) : raw;
    });
    return parse(result.snapshot.val());
  }

  async clear(slug: string) {
    await this.admin.rtdb.ref(rtdb.guests(slug)).remove();
  }
}

export const firebaseGuests = () => new FirebaseGuestRepo(firebaseAdmin());
