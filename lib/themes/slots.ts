import type { ReactNode } from "react";
import type { Moment } from "@/lib/motion";

/**
 * Generic component slots (ADR-022). Games and pages ask for a slot by name;
 * the event's style pack answers with its own component or the default.
 * Every version of a slot takes exactly these props.
 */
export type SurfaceProps = { children: ReactNode; className?: string };
export type BannerProps = {
  title: string;
  subtitle?: string;
  live?: boolean;
  level?: 1 | 2;
  /** Shown at the banner's end, such as the player's total points. */
  aside?: ReactNode;
  /** Shown before the title, such as a back arrow to the games. */
  lead?: ReactNode;
  /** lg is the TV's band, read from across the room. */
  size?: "md" | "lg";
};
export type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
  /** "lg" for the main action on a screen: taller, full width (at least 56 px). */
  size?: "md" | "lg";
};
export type PanelProps = { label: string; children: ReactNode };
export type ScoreCardProps = {
  label: string;
  value?: number;
  state: "scored" | "blank" | "highlight";
  /** xl is the result held up when a game ends. */
  size?: "sm" | "md" | "lg" | "xl";
  /** A score that has just landed, so the card is held up as it appears (a game's result). */
  fresh?: boolean;
};
export type TileState = "empty" | "typed" | "correct" | "present" | "absent";
export type TileProps = { letter?: string; state: TileState };
export type KeyState = "unused" | "correct" | "present" | "absent";
export type KeyProps = {
  label: string;
  state?: KeyState;
  wide?: boolean;
  onPress: (label: string) => void;
};
export type ProgressProps = { done: number; total: number; label: string };
export type ToastProps = { text: string; value?: number };
export type LeaderboardRowProps = {
  rank: number;
  name: string;
  score: number;
  team?: number;
  highlight?: boolean;
  /** md on phones; tv for the TV's dense rows under the podium; lg for a full-height board. */
  size?: "tv" | "md" | "lg";
  /**
   * The TV's top three stand on a podium: the spot, 1 in the middle. The
   * slot places itself (1 centre, 2 left, 3 right) in its board's grid.
   */
  podium?: 1 | 2 | 3;
};
export type BuzzerState = "ready" | "locked" | "buzzed";
export type BuzzerProps = { state: BuzzerState; onBuzz: () => void };
export type CodeEntryProps = {
  onSubmit: (code: string) => void;
  error?: string;
  defaultValue?: string;
};
/** Plays one stage moment, then calls onDone exactly once (spec 14). */
export type CelebrationProps = {
  moment: Moment;
  surface: "player" | "display";
  onDone: () => void;
};

export type SlotComponents = {
  Surface: (p: SurfaceProps) => ReactNode;
  Banner: (p: BannerProps) => ReactNode;
  Button: (p: ButtonProps) => ReactNode;
  Panel: (p: PanelProps) => ReactNode;
  ScoreCard: (p: ScoreCardProps) => ReactNode;
  Tile: (p: TileProps) => ReactNode;
  Key: (p: KeyProps) => ReactNode;
  Progress: (p: ProgressProps) => ReactNode;
  Toast: (p: ToastProps) => ReactNode;
  LeaderboardRow: (p: LeaderboardRowProps) => ReactNode;
  Buzzer: (p: BuzzerProps) => ReactNode;
  CodeEntry: (p: CodeEntryProps) => ReactNode;
  Celebration: (p: CelebrationProps) => ReactNode;
};

export type SlotName = keyof SlotComponents;

export const SLOT_NAMES = [
  "Surface",
  "Banner",
  "Button",
  "Panel",
  "ScoreCard",
  "Tile",
  "Key",
  "Progress",
  "Toast",
  "LeaderboardRow",
  "Buzzer",
  "CodeEntry",
  "Celebration",
] as const satisfies readonly SlotName[];

/** Codes are 5 characters, uppercase, from an alphabet with no look-alikes (ADR-020). */
export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");
