import { vi } from "vitest";

/** Stands in for the Web Animations API, which jsdom lacks. */
type Animate = (
  frames: Keyframe[],
  options?: KeyframeAnimationOptions,
) => { cancel: () => void; finished: Promise<void> };
export const animateSpy = vi.fn<Animate>(() => ({ cancel: vi.fn(), finished: Promise.resolve() }));

let reduced = false;

/** Turns prefers-reduced-motion on or off for the next render. */
export const setReducedMotion = (on: boolean) => {
  reduced = on;
};
export const reducedMotion = () => reduced;
export const resetReducedMotion = () => {
  reduced = false;
};
