import type { Stroke } from "./model";

const SIZE = 256;
const at = (v: number) => String(Math.round(Math.min(1, Math.max(0, v)) * SIZE * 10) / 10);

/**
 * A drawing as a small standalone SVG: dark ink on white, so it reads on any
 * background (ADR-032). Built only from numbers, so nothing in it can run.
 */
export function drawingSvg(strokes: Stroke[]): string {
  const lines = strokes
    .filter((s) => s.length > 0)
    .map((s) => {
      const pts = s.length === 1 ? [s[0], s[0]] : s;
      return `<polyline points="${pts.map((p) => `${at(p?.[0] ?? 0)},${at(p?.[1] ?? 0)}`).join(" ")}"/>`;
    })
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(SIZE)} ${String(SIZE)}">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    `<g fill="none" stroke="#1a1a2e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">` +
    lines +
    `</g></svg>`
  );
}
