# 21: Number Slide

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 16

## Summary

The classic sliding tile puzzle: numbered tiles in a frame with one gap; slide them back into order. A public, centuries-old puzzle type, built in the event's own style. At the party it's a 3×3 board with 8 tiles (Khai, 2026-11-14: quick and kid-friendly). Scored like Pathfinder: half the points for solving, the rest for speed.

## Behavior

1. Content: `size` (3 or 4, default 3) and `scramble` (random moves from solved, 20 to 400, default 80). Each play scrambles the solved board with the play's seed using only legal slides, so it can always be solved, and never starts solved.
2. Tap a tile in the gap's row or column to slide it (and any tiles between it and the gap) into the gap. Tiles glide; a move counter and a clock show.
3. The phone sends the taps when the board is in order. The server replays them from the same start, checks every tap was a legal slide and that the board ends in order, and times the run from when the play started.
4. Points: solving earns half, plus up to half for speed: all of it within 30 s, none at 3 minutes. No time limit.
5. Each play is a new board; replays count their best.
6. Picture option: content `images`, a list of photos (`src`, `alt`); each play takes one by its seed, so replays see different photos. Each tile shows its slice of the photo on white (so a see-through logo reads) instead of a number, a tile in its right place gets a gold outline, and a small copy of the whole photo shows as the goal. The rules and scoring don't change. At the party: five club photos cropped square, plus the Nova Wushu logo (Khai, 2026-11-14).
7. Finale, with a picture: when the last tile slides home, the missing bottom-right piece drops into the gap, then a ripple spreads from it and shows the whole photo before the result. With reduced motion the photo just shows.

## Acceptance criteria

- [x] AC-1: Every seed makes a solvable, unsolved board of the right size.
- [x] AC-2: The server accepts only taps that slide tiles into the gap and end with the board in order.
- [x] AC-3: Solving earns half the points plus up to half for speed (full within 30 s, none at 3 minutes), with no time limit.
- [x] AC-4: The phone slides tiles on tap, counts moves, and sends the taps when the board is in order; the party has Number Slide, which plays end to end.
- [x] AC-5: With photos set, each play takes one; each tile shows its slice of it (not a number), the goal photo shows, and the instructions say to put the picture back together.
- [x] AC-6: Solving a picture drops in the missing piece, then shows the whole photo.
