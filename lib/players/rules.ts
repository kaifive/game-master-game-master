import type { EventStatus } from "@/lib/events";
import { normalizeCode } from "@/lib/themes";
import { isBlockedName } from "./filter";
import { NICKNAME_MAX, NICKNAME_MIN } from "./model";

/** Every player-facing message for joining, in one place. */
export const MESSAGES = {
  tooShort: `Use at least ${NICKNAME_MIN} characters.`,
  tooLong: `Use ${NICKNAME_MAX} characters or fewer.`,
  characters: "Use letters, numbers, spaces and ' - . _ only.",
  blocked: "Pick another name.",
  taken: "That name is taken. Pick another name.",
  wrongCode: "That code isn't right for this event.",
  banned: "This phone can't join this event.",
  ended: "This event has ended, so joining is closed.",
  hasPlayer: "This phone already has a player. Start over to play as someone new.",
  noRestarts: "This phone can't start over again at this event.",
  captain: "Team captains can't start over. Ask the host to hand your team to someone else first.",
  nothingToRestart: "There's no player on this phone to start over from.",
  notSignedIn: "We couldn't recognize this phone. Reload the page and try again.",
} as const;

const KEY_MAX = 64;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
/** Characters as a person counts them: "é" is one, however it was typed. */
const characters = (s: string) => Array.from(graphemes.segment(s)).length;

/** Trimmed, inner spaces collapsed, accents in one form. */
export const cleanNickname = (raw: string) => raw.normalize("NFC").trim().replace(/\s+/gu, " ");

/**
 * The name's uniqueness key and document id: case, spacing, punctuation and
 * accents ignored; any other script kept as "-" plus its code point.
 */
export function nicknameKey(nickname: string): string {
  const folded = nickname.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/đ/g, "d");
  let key = "";
  for (const c of folded) {
    if (/[a-z0-9]/.test(c)) key += c;
    else if (!/[\s'\-._]/u.test(c)) key += `-${(c.codePointAt(0) ?? 0).toString(36)}`;
  }
  return key;
}

export type NicknameCheck =
  { ok: true; nickname: string; key: string } | { ok: false; message: string };

/** The name rules (S02-AC3, AC5), run on the phone as it's typed and again on the server. */
export function checkNickname(raw: string, blocked: readonly string[] = []): NicknameCheck {
  return checkName(raw, blocked, NICKNAME_MAX);
}

/** The name rules for any name, such as a team's (spec 03), up to `max` characters. */
export function checkName(raw: string, blocked: readonly string[], max: number): NicknameCheck {
  const nickname = cleanNickname(raw);
  const length = characters(nickname);
  if (length < NICKNAME_MIN) return { ok: false, message: MESSAGES.tooShort };
  if (length > max) return { ok: false, message: `Use ${String(max)} characters or fewer.` };
  if (!/^[\p{L}\p{N} '\-._]+$/u.test(nickname) || !/[\p{L}\p{N}]/u.test(nickname))
    return { ok: false, message: MESSAGES.characters };
  if (isBlockedName(nickname, blocked)) return { ok: false, message: MESSAGES.blocked };
  const key = nicknameKey(nickname);
  if (key.length > KEY_MAX) return { ok: false, message: MESSAGES.tooLong };
  return { ok: true, nickname, key };
}

/** Whether a typed code is this event's join code. */
export const codeMatches = (input: string | undefined, joinCode: string) =>
  Boolean(input) && normalizeCode(input ?? "") === normalizeCode(joinCode);

/** Joining is open until the host ends the event (S02-AC10). */
export const canJoin = (status: EventStatus) => status !== "ended";
