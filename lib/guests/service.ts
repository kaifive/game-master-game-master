import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { EventConfig } from "@/lib/events";
import {
  GUEST_NAME_MAX,
  MAX_EXTRA,
  MAX_GUESTS,
  pool,
  ticketsOf,
  type Guest,
  type GuestList,
} from "./model";
import type { GuestRepo } from "./repo";
import {
  cleanField,
  guestKey,
  mergeUpload,
  parseGuestCsv,
  setCheckedIn,
  sortGuests,
} from "./rules";

/** Everything the guest service needs (spec 32). */
export type GuestDeps = { guests: GuestRepo; now: () => number; id: () => string };

/** A guest as the check-in page and Controls see them, with tickets left. */
export type GuestRow = Guest & { tickets: number };

export type GuestsView = {
  guests: GuestRow[];
  here: number;
  total: number;
  /** In the raffle: people and tickets (S32-AC7). */
  people: number;
  tickets: number;
  /** Said after an action: "Already on the list: checked in." */
  notice?: string;
  /** After an upload (S32-AC2). */
  upload?: {
    added: number;
    kept: number;
    missing: { id: string; name: string; family: string | null }[];
  };
};

export function viewOf(list: GuestList, extra: Partial<GuestsView> = {}): GuestsView {
  const guests = sortGuests(list.guests).map((g) => ({ ...g, tickets: ticketsOf(g) }));
  return {
    guests,
    here: guests.filter((g) => g.checkedIn).length,
    total: guests.length,
    ...pool(list.guests),
    ...extra,
  };
}

export const guestsView = async (deps: GuestDeps, event: EventConfig) =>
  viewOf(await deps.guests.read(event.slug));

const Id = z.string().min(1).max(64);

/** What a door helper can do (S32-AC3 to AC5). */
export const CheckinAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("checkIn"),
    ids: z.array(Id).min(1).max(50),
    checkedIn: z.boolean(),
  }),
  z.object({
    action: z.literal("add"),
    name: z.string().max(200),
    family: z.string().max(200).optional(),
  }),
]);

/** What only the host can do (S32-AC1, AC2, AC7). */
export const AdminGuestAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upload"), csv: z.string().max(500_000) }),
  z.object({ action: z.literal("tickets"), id: Id, extra: z.number().int() }),
  z.object({ action: z.literal("remove"), id: Id }),
]);

function nameField(raw: string, what: string): string {
  const v = cleanField(raw);
  if (v.length > GUEST_NAME_MAX)
    throw new AppError(
      "BAD_REQUEST",
      `${what} can be ${String(GUEST_NAME_MAX)} characters at most.`,
    );
  return v;
}

export async function checkinAction(
  deps: GuestDeps,
  event: EventConfig,
  body: z.infer<typeof CheckinAction>,
): Promise<GuestsView> {
  const now = deps.now();
  if (body.action === "checkIn") {
    const ids = body.ids;
    const list = await deps.guests.update(event.slug, (cur) =>
      setCheckedIn(cur, ids, body.checkedIn, now),
    );
    return viewOf(list);
  }
  const name = nameField(body.name, "Names");
  if (!name) throw new AppError("BAD_REQUEST", "Type the guest's name.");
  const family = nameField(body.family ?? "", "Families") || null;
  const key = guestKey(family, name);
  const box = { found: false, full: false };
  const newId = deps.id();
  const list = await deps.guests.update(event.slug, (cur) => {
    const found = cur.guests.find((g) => g.key === key);
    box.found = Boolean(found);
    // Already on the list: check them in rather than adding a copy (S32-AC4).
    if (found) return setCheckedIn(cur, [found.id], true, now);
    if (cur.guests.length >= MAX_GUESTS) {
      box.full = true;
      return null;
    }
    const guest: Guest = {
      id: newId,
      name,
      family,
      key,
      checkedIn: true,
      checkedInAt: now,
      source: "door",
      extra: 0,
      won: 0,
    };
    return { guests: [...cur.guests, guest], updatedAt: now };
  });
  if (box.full)
    throw new AppError("CONFLICT", `The list holds ${String(MAX_GUESTS)} guests at most.`);
  return viewOf(list, box.found ? { notice: "Already on the list: checked in." } : {});
}

export async function adminGuestAction(
  deps: GuestDeps,
  event: EventConfig,
  body: z.infer<typeof AdminGuestAction>,
): Promise<GuestsView> {
  const now = deps.now();
  if (body.action === "upload") {
    const parsed = parseGuestCsv(body.csv);
    if (!parsed.ok) throw new AppError("BAD_REQUEST", parsed.message);
    const rows = parsed.rows;
    const box: { result: ReturnType<typeof mergeUpload> | null; full: boolean } = {
      result: null,
      full: false,
    };
    const list = await deps.guests.update(event.slug, (cur) => {
      try {
        box.result = mergeUpload(cur, rows, now, deps.id);
        return box.result.list;
      } catch {
        box.full = true;
        return null;
      }
    });
    if (box.full || !box.result)
      throw new AppError("CONFLICT", `The list holds ${String(MAX_GUESTS)} guests at most.`);
    const { added, kept, missing } = box.result;
    return viewOf(list, {
      upload: {
        added,
        kept,
        missing: missing.map((g) => ({ id: g.id, name: g.name, family: g.family })),
      },
    });
  }
  if (body.action === "tickets") {
    if (body.extra < 0 || body.extra > MAX_EXTRA)
      throw new AppError("BAD_REQUEST", `Extra tickets go from 0 to ${String(MAX_EXTRA)}.`);
    const extra = body.extra;
    const list = await deps.guests.update(event.slug, (cur) => ({
      guests: cur.guests.map((g) => (g.id === body.id ? { ...g, extra } : g)),
      updatedAt: now,
    }));
    return viewOf(list);
  }
  const list = await deps.guests.update(event.slug, (cur) => ({
    guests: cur.guests.filter((g) => g.id !== body.id),
    updatedAt: now,
  }));
  return viewOf(list);
}

/** Uses up one of a guest's tickets: the raffle's Claimed (S32-AC10). */
export const spendTicket = (repo: GuestRepo, slug: string, guestId: string, now: number) =>
  repo.update(slug, (cur) => ({
    guests: cur.guests.map((g) => (g.id === guestId ? { ...g, won: g.won + 1 } : g)),
    updatedAt: now,
  }));
