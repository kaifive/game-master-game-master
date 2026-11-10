# 18: Color Matcher and Quick Draw

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 09

## Summary

Two games about the Nova Wushu logo (`public/events/nova-wushu-logo.png`, from Khai, 2026-11-07), played from memory. **Color Matcher**: pick on a color wheel to match the logo's purple, `#882E7E`. **Quick Draw**: draw the logo with one pen, untimed; a judge on the server scores how close the shapes are. Khai asked for an automatic judge, with Controls' Change points for any score the room disagrees with.

## Behavior

### Color Matcher (`color`)

1. Content: a `target` color (hex) and a `prompt`. The phone never sees the target before locking in.
2. A color wheel (tap or drag: around the wheel picks the shade, toward the edge makes it stronger), a **Brightness** slider and a large live swatch; **Lock in this color** sends it (Khai, 2026-11-10: easier than red, green and blue sliders; the wheel also works by keyboard and screen reader as two sliders). The difference is measured the way eyes see it (CIE Lab, ΔE): within 3 earns all the points, falling to 0 at 50. Replayable when the event is.
3. The result shows the match as a percentage. In a replayable event it doesn't show the logo's color, so a replay can't just copy it; otherwise it shows yours and the logo's.

### Quick Draw (`draw`)

4. Content: a `prompt` and the `reference` outline (`nova-logo`). One drawing per player, not replayable.
5. No clock (Khai, 2026-11-10): one pen draws on a square canvas; **Clear** wipes it; **I'm done** sends the strokes.
6. The judge (`lib/games/draw/score.ts`) fits the drawing and the reference to the same 64×64 grid, so size and position don't matter, then compares them within a square of slack: how much of the ink lands near the logo's lines, and how much of the logo the ink comes near, the inner shapes counting more than the outer ring. Heavy scribbling counts against it. A match of 0.3 or less earns nothing and 0.8 or more earns everything. The outline comes from the logo image, edges only.
7. The result shows the match as the share of points earned ("72% match"), with no Play again. The host can change any score in Controls.

## Data

- Color play `state`: the picked color. Draw play `state`: the strokes (points as shares of the canvas, at most 600 strokes and 4,000 points) and the match.
- `lib/games/draw/nova-logo.ts`: the logo's outline, generated from the image.

## Acceptance criteria

- [x] AC-1: Color Matcher's target is validated and never sent to phones before the pick.
- [x] AC-2: The pick scores all points within ΔE 3 of the target, falling to 0 at ΔE 50, once per run; a replayable event never shows the target.
- [x] AC-3: Quick Draw takes one untimed drawing, judged on the server, and it can't be replayed.
- [x] AC-4: The judge ignores size and position, ranks a faithful sketch above a rough one, and gives a circle alone or a scribble almost nothing.
- [x] AC-5: Both games are in the party's event file and play end to end on a phone.

## Tests

- Unit: `lib/games/color/logic.test.ts`, `lib/games/draw/logic.test.ts`, `lib/games/draw/score.test.ts`.
- Component: the slider and canvas screens.
- E2E: one run of each on a phone.

## Out of scope

- Showing drawings on the TV (with photos, spec 13).
- Votes on drawings.
