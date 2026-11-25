/**
 * Guests and the raffle (spec 32). A guest is someone on the RSVP list or
 * added at the door; a checked-in guest holds raffle tickets.
 */

export type Guest = {
  id: string;
  name: string;
  family: string | null;
  /** Normalized "family|name", for merging uploads and spotting duplicates. */
  key: string;
  checkedIn: boolean;
  checkedInAt: number | null;
  source: "list" | "door";
  /** Extra raffle tickets the host gave (paid in person, say). */
  extra: number;
  /** Tickets used up by Claimed. */
  won: number;
};

export type GuestList = { guests: Guest[]; updatedAt: number };

export const EMPTY_GUESTS: GuestList = { guests: [], updatedAt: 0 };

export const MAX_GUESTS = 1000;
export const GUEST_NAME_MAX = 60;
export const MAX_EXTRA = 99;

/** A checked-in guest holds 1 + extra − won tickets, never below 0; anyone else none (S32-AC7). */
export const ticketsOf = (g: Guest) => (g.checkedIn ? Math.max(0, 1 + g.extra - g.won) : 0);

/** How many people and tickets are in the draw, leaving out anyone skipped. */
export function pool(guests: readonly Guest[], skipped: readonly string[] = []) {
  const skip = new Set(skipped);
  let people = 0;
  let tickets = 0;
  for (const g of guests) {
    if (skip.has(g.id)) continue;
    const t = ticketsOf(g);
    if (t > 0) {
      people += 1;
      tickets += t;
    }
  }
  return { people, tickets };
}

/** Reads a stored list, dropping anything malformed. */
export function normalizeGuests(raw: unknown): GuestList {
  if (!raw || typeof raw !== "object") return EMPTY_GUESTS;
  const v = raw as Partial<GuestList>;
  const items: unknown[] = Array.isArray(v.guests) ? v.guests : [];
  const guests = items.filter(
    (g): g is Guest =>
      typeof g === "object" &&
      g !== null &&
      typeof (g as { id?: unknown }).id === "string" &&
      typeof (g as { name?: unknown }).name === "string",
  );
  return {
    guests: guests.map((g) => ({
      ...g,
      family: typeof g.family === "string" ? g.family : null,
      checkedIn: (g as { checkedIn?: unknown }).checkedIn === true,
      checkedInAt: typeof g.checkedInAt === "number" ? g.checkedInAt : null,
      source: g.source === "door" ? "door" : "list",
      extra: Number.isInteger(g.extra) ? g.extra : 0,
      won: Number.isInteger(g.won) ? g.won : 0,
    })),
    updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : 0,
  };
}
