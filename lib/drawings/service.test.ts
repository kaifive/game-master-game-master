import { describe, expect, it } from "vitest";
import { MemoryDrawingFiles, MemoryDrawingRepo } from "./repo.memory";
import { clearDrawings, keepDrawing, type DrawingDeps } from "./service";
import { drawingSvg } from "./svg";

const deps = (files: DrawingDeps["files"] = new MemoryDrawingFiles()): DrawingDeps => {
  let n = 0;
  return { drawings: new MemoryDrawingRepo(), files, now: () => 5000, id: () => `d${String(++n)}` };
};
const run = {
  gameId: "quick-draw",
  playerId: "p1",
  run: 2,
  points: 64,
  strokes: [
    [
      [0, 0],
      [0.5, 0.25],
    ],
    [[1, 1]],
  ] as [number, number][][],
};

describe("kept drawings (ADR-032)", () => {
  it("S18-AC7: a finished drawing is saved as an SVG with its record", async () => {
    const d = deps();
    const kept = await keepDrawing(d, "holiday-2026", run);
    expect(kept).toMatchObject({
      id: "d1",
      gameId: "quick-draw",
      playerId: "p1",
      run: 2,
      points: 64,
    });
    expect(kept?.url).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(kept?.url ?? "")).toContain('points="0,0 128,64"');
    expect(await d.drawings.list("holiday-2026")).toEqual([kept]);
  });

  it("S18-AC7: the SVG is plain ink on white, built only from numbers", () => {
    const svg = drawingSvg([
      [
        [2, -1],
        [0.1, 0.2],
      ],
      [],
    ]);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain('fill="#fff"');
    // Out-of-range points are clamped; empty strokes are dropped.
    expect(svg).toContain('points="256,0 25.6,51.2"');
    expect(svg.match(/<polyline/g)).toHaveLength(1);
    expect(svg).not.toMatch(/script|on\w+=/i);
  });

  it("S18-AC8: with no Blob store connected nothing is kept", async () => {
    const d = deps(null);
    expect(await keepDrawing(d, "holiday-2026", run)).toBeNull();
    expect(await d.drawings.list("holiday-2026")).toEqual([]);
  });

  it("S18-AC8: clearing deletes the files, then the records", async () => {
    const files = new MemoryDrawingFiles();
    const d = deps(files);
    const kept = await keepDrawing(d, "holiday-2026", run);
    await clearDrawings(d, "holiday-2026");
    expect(files.removed).toEqual([kept?.url]);
    expect(await d.drawings.list("holiday-2026")).toEqual([]);
  });
});
