"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { useSlots } from "@/components/slots/registry";
import {
  emptyStage,
  emptyToasts,
  finishStage,
  laneFor,
  pushStage,
  pushToast,
  tickToasts,
  type Moment,
  type StageState,
  type Surface,
  type ToastChainState,
} from "@/lib/motion";

type State = { toasts: ToastChainState; stage: StageState };
type Action =
  | { type: "add"; moment: Moment; surface: Surface }
  | { type: "tick"; ms: number }
  | { type: "finish" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const { moment, surface } = action;
      if (laneFor(moment.kind, surface) === "stage")
        return { ...state, stage: pushStage(state.stage, moment) };
      const toast = {
        id: moment.id,
        text: moment.text,
        ...(moment.value !== undefined ? { value: moment.value } : {}),
      };
      return { ...state, toasts: pushToast(state.toasts, toast) };
    }
    case "tick":
      return {
        ...state,
        toasts: tickToasts(state.toasts, action.ms, state.stage.current !== null),
      };
    case "finish":
      return { ...state, stage: finishStage(state.stage) };
  }
}

type Ctx = State & { surface: Surface; celebrate: (m: Moment) => void; finish: () => void };
const MomentsContext = createContext<Ctx | null>(null);
const TICK_MS = 250;

/** Routes moments to the toast chain or the stage queue for one surface (spec 14). */
export function MomentsProvider({ surface, children }: { surface: Surface; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { toasts: emptyToasts(), stage: emptyStage() });
  const hasToasts = state.toasts.visible.length > 0;

  useEffect(() => {
    if (!hasToasts) return;
    const id = setInterval(() => {
      dispatch({ type: "tick", ms: TICK_MS });
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [hasToasts]);

  const celebrate = useCallback(
    (moment: Moment) => {
      dispatch({ type: "add", moment, surface });
    },
    [surface],
  );
  const finish = useCallback(() => {
    dispatch({ type: "finish" });
  }, []);
  const value = useMemo(
    () => ({ ...state, surface, celebrate, finish }),
    [state, surface, celebrate, finish],
  );
  return <MomentsContext.Provider value={value}>{children}</MomentsContext.Provider>;
}

const noop = () => undefined;

/** celebrate(moment): plays it on the stage or adds it to the toast chain. */
export const useCelebrate = () => useContext(MomentsContext)?.celebrate ?? noop;

/** The toast chain: at most four, newest on top. */
export function ToastChainView() {
  const ctx = useContext(MomentsContext);
  const { Toast } = useSlots();
  if (!ctx) return null;
  return (
    <ol
      aria-live="polite"
      aria-label="Latest"
      className="m-0 grid list-none justify-items-end gap-2 p-0"
    >
      {ctx.toasts.visible.map((t) => (
        <li
          key={t.id}
          className="motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)]"
        >
          <Toast text={t.text} {...(t.value !== undefined ? { value: t.value } : {})} />
        </li>
      ))}
    </ol>
  );
}

/** Plays the current stage moment with the pack's Celebration slot. */
export function MomentsStage() {
  const ctx = useContext(MomentsContext);
  const { Celebration } = useSlots();
  if (!ctx?.stage.current) return null;
  return (
    <Celebration
      key={ctx.stage.current.id}
      moment={ctx.stage.current}
      surface={ctx.surface}
      onDone={ctx.finish}
    />
  );
}
