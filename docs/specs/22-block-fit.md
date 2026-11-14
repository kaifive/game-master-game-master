# 22: Block Fit

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 16

## Summary

A shape-fitting puzzle: chunky grid pieces (three to five squares each) fill a rectangle exactly. Drag a piece onto the board; tap it to turn it. A generic polyomino puzzle in the event's own style. Each play makes a new puzzle from the play's seed, built by cutting the rectangle into pieces, so it always has a solution (Khai, 2026-11-14: "block fit" over tangrams). Scored like Pathfinder: half for solving, the rest for speed.

## Behavior

1. Content: `width` and `height` (4 to 6, default 5 × 4). The puzzle cuts the board into connected pieces of 3 to 5 squares, then shows each piece turned a random way.
2. Tap a piece in the tray to turn it a quarter turn. Drag it onto the board: it snaps to the squares under it, and only drops where it fits (inside the board, over no other piece). Tap a placed piece to send it back to the tray. **Reset** clears the board.
3. When every square is covered, the phone sends the placements. The server turns each piece as the phone did, checks they stay inside the board, don't overlap and cover it exactly, and times the run.
4. Points: solving earns half, plus up to half for speed: all of it within 30 s, none at 3 minutes. No time limit.
5. Picture option: content `images`, a list of photos (`src`, `alt`) in the board's shape (5:4 for 5 × 4); each play takes one by its seed. Each piece shows its slices of the photo, turned as the piece is dealt and turning with it, so putting the photo back together solves the puzzle. Any exact fit still counts: the rules and scoring don't change. At the party: five club photos Khai cropped to 5:4 (2026-11-14).
6. Finale, with a picture: when the board is full, a ripple spreads from the last piece and shows the whole photo before the result. With reduced motion the photo just shows.

## Acceptance criteria

- [x] AC-1: Every seed cuts the board into connected pieces of 3 to 5 squares that cover it exactly.
- [x] AC-2: The server accepts only placements that, turned as sent, cover the board exactly with no overlap.
- [x] AC-3: Solving earns half the points plus up to half for speed (full within 30 s, none at 3 minutes), with no time limit.
- [x] AC-4: The phone turns a piece on tap, drops it only where it fits, sends the placements when the board is full, and the party has Block Fit, which plays end to end.
- [x] AC-5: With photos set, each play takes one; each piece shows its slices of it, turned as dealt and turning with the piece, and a full board shows the whole photo.
