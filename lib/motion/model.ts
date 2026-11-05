export { MOTION_TOKENS } from "@/lib/themes";

/** Things worth celebrating (spec 14). The server writes them to moments/{slug}. */
export const MOMENT_KINDS = [
  "game-finished",
  "points",
  "rank-change",
  "lead-change",
  "team-created",
  "big-donation",
  "judged-right",
  "judged-wrong",
  "phase-change",
  "photo-winner",
  "final-standings",
] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];

export type Moment = {
  id: string;
  kind: MomentKind;
  /** Plain words for the toast or the callout: "Mai finished Gift Guess". */
  text: string;
  value?: number;
};

/** Small, frequent moments are toasts; big, rare ones take the stage. */
export type Lane = "toast" | "stage";
export type Surface = "player" | "display";

export type Toast = { id: string; text: string; value?: number };
export type ToastChainState = { visible: (Toast & { remaining: number })[]; waiting: Toast[] };
export type StageState = { current: Moment | null; waiting: Moment[] };
