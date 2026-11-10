# 18: Color Matcher and Quick Draw

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 09

## Summary

Two games about the Nova Wushu logo (`public/events/nova-wushu-logo.png`, from Khai, 2026-11-07), played from memory. **Color Matcher**: pick on a color wheel to match the logo's purple, `#882E7E`. **Quick Draw**: draw the logo with one pen, untimed; a judge on the server scores how close the shapes are. Khai asked for an automatic judge, with Controls' Change points for any score the room disagrees with.

## Behavior

### Color Matcher (`color`)

1. Content: a `target` color (hex) and a `prompt`. The phone never sees the target before locking in.
2. A color wheel (tap or drag: around the wheel picks the shade, toward the edge makes it stronger), a **Brightness** slider and a large live swatch; **Lock in this color** sends it (Khai, 2026-11-10: easier than red, green and blue sliders; the wheel also works by keyboard and screen reader as two sliders). The difference is measured the way eyes see it (CIEDE2000 ΔE, which judges purples, greys and vividness as eyes do; the older CIE76 made scores feel random, Khai 2026-11-10): within 2 earns all the points, falling to 0 at 25. Replayable when the event is.
3. The result shows the match as a percentage. In a replayable event it doesn't show the logo's color, so a replay can't just copy it; otherwise it shows yours and the logo's.

### Quick Draw (`draw`)

4. Content: a `prompt` and the `reference` outline (`nova-logo`). Replayable when the event is, like the other games (Khai, 2026-11-10).
5. No clock (Khai, 2026-11-10): one pen draws on a square canvas; **Clear** wipes it; **I'm done** sends the strokes.
6. The judge (`lib/games/draw/score.ts`) fits the drawing and the reference to the same 64×64 grid, so size and position don't matter, sizing it by all but the outermost 1.5% of the ink so a stray mark doesn't shrink it, then compares them within two squares of slack (half credit one square further): how much of the ink lands near the logo's lines, and how much of the logo the ink comes near, the inner shapes counting more than the outer ring. Heavy scribbling counts against it. A match of 0.55 or less earns nothing and 0.9 or more earns everything: a careful hand drawing of the logo scores about 90%, a circle alone nothing (retuned 2026-11-10: Khai found scores random). The outline comes from the logo image, edges only.
7. The result shows the match as the share of points earned ("72% match"), with Play again in a replayable event. The host can change any score in Controls.

### Keeping drawings (ADR-032)

8. A drawing game opts in with `keepDrawings: true` in the event file (Khai, 2026-11-10: only the games he picks, not all). The event file is refused if a game that makes no drawing sets it.
9. Each finished run of such a game is kept: the server saves the strokes as an SVG image in Vercel Blob, with a record of the player, game, run and points. A game without the flag keeps nothing. A save that fails is logged and never blocks the score.
10. In Controls, a **Drawings** card (only for events with such a game) loads the kept drawings on request (each costs a read): a picture, the player's name and the points, newest first. Without a Blob store connected it says drawings aren't being kept. Clearing test data deletes them.

## Data

- Color play `state`: the picked color. Draw play `state`: the strokes (points as shares of the canvas, at most 600 strokes and 4,000 points) and the match.
- Kept drawings: `events/{slug}/drawings/{id}` (game, player, run, points, blob URL, when) and the SVG in Blob at `events/{slug}/drawings/{gameId}/{playerId}-{run}-<random>.svg`.
- `lib/games/draw/nova-logo.ts`: the logo's outline, generated from the image.

## Acceptance criteria

- [x] AC-1: Color Matcher's target is validated and never sent to phones before the pick.
- [x] AC-2: The pick scores all points within ΔE 2 (CIEDE2000) of the target, falling to 0 at ΔE 25, once per run; a replayable event never shows the target.
- [x] AC-3: Quick Draw takes an untimed drawing, judged on the server, and is replayable when the event is.
- [x] AC-4: The judge ignores size and position, ranks a faithful sketch above a rough one, and gives a circle alone or a scribble almost nothing.
- [x] AC-5: Both games are in the party's event file and play end to end on a phone.
- [x] AC-6: `keepDrawings` is accepted only on a game type that makes a drawing.
- [x] AC-7: A finished run of a game that keeps drawings saves its drawing as an SVG with a record; a game without the flag saves nothing; a failed save doesn't block the score.
- [x] AC-8: Controls shows the kept drawings on request with the player and points, says when no Blob store is connected, and clearing test data deletes them.

## Tests

- Unit: `lib/games/color/logic.test.ts`, `lib/games/draw/logic.test.ts`, `lib/games/draw/score.test.ts`.
- Component: the slider and canvas screens.
- E2E: one run of each on a phone.

## Out of scope

- Showing drawings on the TV or in a recap (with photos, spec 13).
- Votes on drawings.
