import { GUEST_NAME_MAX, MAX_GUESTS, type Guest, type GuestList } from "./model";

/** Spaces trimmed and collapsed, accents in one form. */
export const cleanField = (raw: string) => raw.normalize("NFC").trim().replace(/\s+/gu, " ");

/** Matching ignores case, accents and extra spaces (S32-AC2). */
const fold = (s: string) =>
  cleanField(s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/đ/g, "d");

export const guestKey = (family: string | null, name: string) =>
  `${family ? fold(family) : ""}|${fold(name)}`;

/** Splits CSV text into rows of fields: commas, quotes ("a, b" and ""), and any line ending. */
export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src.charAt(i);
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type UploadRow = { family: string | null; name: string };
export type Parsed = { ok: true; rows: UploadRow[] } | { ok: false; message: string };

const HEADERS = new Set(["name", "names", "family", "family,name", "name,family"]);

/**
 * The RSVP file (S32-AC1): one column of names, or family then name. A
 * header row is skipped; `name,family` swaps the columns.
 */
export function parseGuestCsv(text: string): Parsed {
  const rows = csvRows(text).map((r) => r.map(cleanField));
  const first = rows[0]?.filter((f) => f !== "").map((f) => f.toLowerCase()) ?? [];
  const header = HEADERS.has(first.join(",")) || HEADERS.has(first[0] ?? "");
  const swapped = header && first[0] === "name" && first[1] === "family";
  const body = header ? rows.slice(1) : rows;
  if (body.length > MAX_GUESTS)
    return { ok: false, message: `That file has more than ${String(MAX_GUESTS)} rows.` };
  const two = body.some((r) => r.filter((f) => f !== "").length >= 2);
  const out: UploadRow[] = [];
  for (const r of body) {
    const [a = "", b = ""] = r;
    let family = two ? (swapped ? b : a) : "";
    let name = two ? (swapped ? a : b) : a;
    // A row with only one field in a two-column file is a name on its own.
    if (two && !name && family) [name, family] = [family, ""];
    if (!name) continue;
    if (name.length > GUEST_NAME_MAX || family.length > GUEST_NAME_MAX)
      return {
        ok: false,
        message: `Names and families can be ${String(GUEST_NAME_MAX)} characters at most: "${name.slice(0, 20)}…".`,
      };
    out.push({ family: family || null, name });
  }
  if (out.length === 0) return { ok: false, message: "No names found in that file." };
  return { ok: true, rows: out };
}

export type MergeResult = {
  list: GuestList;
  added: number;
  kept: number;
  /** On the list but not in the file: shown with Remove (S32-AC2). */
  missing: Guest[];
};

/** Adds the file's new names, keeps matches as they are, and lists the rest (S32-AC2). */
export function mergeUpload(
  list: GuestList,
  rows: readonly UploadRow[],
  now: number,
  newId: () => string,
): MergeResult {
  const byKey = new Map(list.guests.map((g) => [g.key, g]));
  const seen = new Set<string>();
  const guests = [...list.guests];
  let added = 0;
  let kept = 0;
  for (const r of rows) {
    const key = guestKey(r.family, r.name);
    if (seen.has(key)) continue;
    seen.add(key);
    if (byKey.has(key)) {
      kept += 1;
      continue;
    }
    guests.push({
      id: newId(),
      name: r.name,
      family: r.family,
      key,
      checkedIn: false,
      checkedInAt: null,
      source: "list",
      extra: 0,
      won: 0,
    });
    added += 1;
  }
  if (guests.length > MAX_GUESTS) throw new RangeError("too many guests");
  return {
    list: { guests, updatedAt: now },
    added,
    kept,
    missing: list.guests.filter((g) => !seen.has(g.key) && g.source === "list"),
  };
}

/** Checks guests in or out (S32-AC3). */
export function setCheckedIn(
  list: GuestList,
  ids: readonly string[],
  checkedIn: boolean,
  now: number,
): GuestList {
  const set = new Set(ids);
  return {
    guests: list.guests.map((g) =>
      set.has(g.id) && g.checkedIn !== checkedIn
        ? { ...g, checkedIn, checkedInAt: checkedIn ? now : null }
        : g,
    ),
    updatedAt: now,
  };
}

/** Families first, then names; guests with no family by name among them (spec 32 UI). */
export const sortGuests = (guests: readonly Guest[]) =>
  [...guests].sort(
    (a, b) =>
      (a.family ?? a.name).localeCompare(b.family ?? b.name) || a.name.localeCompare(b.name),
  );
