import "server-only";
import { backend } from "@/lib/backend";
import type { GuestRepo } from "./repo";
import { firebaseGuests } from "./repo.firebase";
import { MemoryGuestRepo } from "./repo.memory";

const shared = globalThis as typeof globalThis & { __gmMemoryGuests?: MemoryGuestRepo };

/** Where guest lists live: the Realtime Database, or one in-memory store per server process. */
export const guestRepo = (): GuestRepo =>
  backend() === "firebase" ? firebaseGuests() : (shared.__gmMemoryGuests ??= new MemoryGuestRepo());
