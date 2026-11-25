import { TEAM_COLOR_COUNT } from "@/lib/themes";
/** Teams (spec 03, ADR-030). A team plays team games as one player, on its captain's phone. */
export type Team = {
  id: string;
  /** Null until the captain names it; shows as "Team <captain>" until then. */
  name: string | null;
  /** 1–8, into the theme's --gm-team-N colors. */
  color: number;
  captainId: string | null;
  memberIds: string[];
  createdAt: number;
  /** The team selfie (spec 31), or null until taken. Never sent to phones. */
  selfie?: Selfie | null;
  /** The host's stickers on the selfie, back to front (spec 31). */
  stickers?: Sticker[];
};

/** A team selfie in Blob (spec 31): its size, for laying stickers on it. */
export type Selfie = {
  url: string;
  width: number;
  height: number;
  /** Once backed up and its file deleted (ADR-012, ADR-042). */
  archived?: { at: number; backup: string };
};

/** The stickers the host can put on a selfie (spec 31). */
export const STICKER_KINDS = [
  "santa-hat",
  "elf-hat",
  "crown",
  "antlers",
  "mustache",
  "beard",
  "glasses",
  "bow-tie",
  "red-nose",
  "holly",
] as const;
export type StickerKind = (typeof STICKER_KINDS)[number];

/**
 * One sticker on a selfie: its center as shares of the photo (0 to 1), its
 * width as a share of the photo's width, its angle in degrees, and whether
 * it's flipped (spec 31). Kept apart from the photo, so it can move later.
 */
export type Sticker = {
  id: string;
  kind: StickerKind;
  x: number;
  y: number;
  size: number;
  angle: number;
  flip: boolean;
};

export const MAX_STICKERS = 30;

export const TEAM_NAME_MAX = 20;
export const TEAM_COLORS = TEAM_COLOR_COUNT;
/** Most teams an event can have, so every showdown fits (Khai, 2026-11-18). */
export const MAX_TEAMS = 6;

/** What phones see about a team. */
export type TeamView = {
  id: string;
  name: string;
  named: boolean;
  color: number;
  captain: { id: string; nickname: string } | null;
  members: { id: string; nickname: string }[];
  room: number;
};

/**
 * What phones see of teams, written by the server after every team change
 * (spec 03) so polling phones read one Realtime Database value, not Firestore.
 */
export type TeamsSummary = {
  phase: "individual" | "team";
  maxTeamSize: number;
  teams: TeamView[];
  /** Whether the standings show on phones and on the TV (S07-AC11). */
  board: BoardVisibility;
  /** The event has ended, so the TV shows the finale (spec 31). */
  ended?: boolean;
};

export type BoardVisibility = { phones: boolean; tv: boolean };
export const BOARD_SHOWN: BoardVisibility = { phones: true, tv: true };
