import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { animateSpy, reducedMotion, resetReducedMotion } from "./motion";

// jsdom has no matchMedia: answer prefers-reduced-motion from tests/motion.ts.
window.matchMedia = (query: string) =>
  ({
    matches: query.includes("prefers-reduced-motion: reduce") ? reducedMotion() : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

// jsdom has no Web Animations API: record calls instead.
Element.prototype.animate = animateSpy as unknown as Element["animate"];

afterEach(() => {
  cleanup();
  resetReducedMotion();
  animateSpy.mockClear();
});
