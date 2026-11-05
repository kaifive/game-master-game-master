import type {
  Lane,
  Moment,
  MomentKind,
  StageState,
  Surface,
  Toast,
  ToastChainState,
} from "./model";

/** "300ms" or "1.2s" to milliseconds; 0 for anything else. */
export function parseDuration(value: string): number {
  const m = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!m) return 0;
  const n = Number(m[1]);
  return m[2] === "s" ? n * 1000 : n;
}

/** Fast start, gentle landing (matches the ease-out token's feel). */
export const easeOut = (t: number) => (t >= 1 ? 1 : 1 - (1 - t) ** 3);

/** The number to show at a point in a count-up; exact at the end. */
export function countUpValue(from: number, to: number, progress: number): number {
  if (progress >= 1) return to;
  return Math.round(from + (to - from) * easeOut(Math.max(0, progress)));
}

/** FLIP: how far an item must be pushed back to appear where it was. */
export const flipDelta = (
  from: { left: number; top: number },
  to: { left: number; top: number },
) => ({
  dx: from.left - to.left,
  dy: from.top - to.top,
});

const MIN_SHARE = 0.04;

/** A bar's width as a share of the top score, never fully invisible. */
export function barShare(score: number, max: number): number {
  if (max <= 0) return MIN_SHARE;
  return Math.max(MIN_SHARE, Math.min(1, score / max));
}

const STAGE: Record<Surface, ReadonlySet<MomentKind>> = {
  display: new Set([
    "lead-change",
    "big-donation",
    "judged-right",
    "judged-wrong",
    "phase-change",
    "photo-winner",
    "final-standings",
  ]),
  player: new Set([
    "game-finished",
    "judged-right",
    "judged-wrong",
    "phase-change",
    "photo-winner",
    "final-standings",
  ]),
};

export const laneFor = (kind: MomentKind, surface: Surface): Lane =>
  STAGE[surface].has(kind) ? "stage" : "toast";

export const TOAST_LIMIT = 4;
export const TOAST_MS = 5000;

export const emptyToasts = (): ToastChainState => ({ visible: [], waiting: [] });

function fill(state: ToastChainState): ToastChainState {
  const visible = [...state.visible];
  const waiting = [...state.waiting];
  while (visible.length < TOAST_LIMIT && waiting.length > 0) {
    const next = waiting.shift();
    if (next) visible.unshift({ ...next, remaining: TOAST_MS });
  }
  return { visible, waiting };
}

/** Adds a toast: newest on top, at most four showing, the rest wait. */
export const pushToast = (state: ToastChainState, toast: Toast): ToastChainState =>
  fill({ visible: state.visible, waiting: [...state.waiting, toast] });

/** Advances time; while paused (a stage moment is playing) nothing expires. */
export function tickToasts(
  state: ToastChainState,
  elapsed: number,
  paused: boolean,
): ToastChainState {
  if (paused || state.visible.length === 0) return state;
  const visible = state.visible
    .map((t) => ({ ...t, remaining: t.remaining - elapsed }))
    .filter((t) => t.remaining > 0);
  return fill({ visible, waiting: state.waiting });
}

export const emptyStage = (): StageState => ({ current: null, waiting: [] });

/** Queues a stage moment; it plays at once if the stage is free. */
export const pushStage = (state: StageState, moment: Moment): StageState =>
  state.current
    ? { ...state, waiting: [...state.waiting, moment] }
    : { current: moment, waiting: state.waiting };

/** Ends the current stage moment and starts the next in arrival order. */
export function finishStage(state: StageState): StageState {
  const [next, ...rest] = state.waiting;
  return { current: next ?? null, waiting: rest };
}
