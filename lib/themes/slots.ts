import type { ReactNode } from "react";

/**
 * Generic component slots (ADR-022). Games and pages ask for a slot by name;
 * the event's style pack answers with its own component or the default.
 * Every version of a slot takes exactly these props.
 */
export type SurfaceProps = { children: ReactNode; className?: string };
export type BannerProps = { title: string; subtitle?: string; live?: boolean; level?: 1 | 2 };
export type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
};
export type PanelProps = { label: string; children: ReactNode };
export type ScoreCardProps = {
  label: string;
  value?: number;
  state: "scored" | "blank" | "highlight";
  size?: "sm" | "md" | "lg";
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
};
export type BuzzerState = "ready" | "locked" | "buzzed";
export type BuzzerProps = { state: BuzzerState; onBuzz: () => void };
export type CodeEntryProps = {
  onSubmit: (code: string) => void;
  error?: string;
  defaultValue?: string;
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
] as const satisfies readonly SlotName[];

/** Codes are 5 characters, uppercase, from an alphabet with no look-alikes (ADR-020). */
export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");
