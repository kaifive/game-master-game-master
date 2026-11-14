# 16: Quick games (T-Timer, Tap Masher, Pathfinder, Stack Attack, Rapid Recall)

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 09, 14

## Summary

Five more solo games for the party, so there's plenty to play and test. Each is a game type on spec 08's framework, played on the player's phone in the event's style pack, worth up to the event's `soloGamePoints`, and replayable when the event is (best run counts). Khai's answers (2026-11-07) set the rules below; his playtest feedback (2026-11-10) retuned them.

## Behavior

### All five

1. Each type has content in the event file (validated like trivia's), instructions built from it, and a phone renderer. Points are fixed when a run ends; the best run counts (S08-AC12).
2. Where a game is timed by taps, the phone measures time (it's exact; the network isn't) and the server checks the claim is possible: no more time than really passed, and no more taps than a person could make. A run left unfinished times out on the server.
3. Tap targets are at least 44 px, and a game's playing area never scrolls the page.
4a. Each game begins the moment its instructions box closes: no second Start button (spec 08). The instructions say so where a clock or countdown starts.

### T-Timer (`timer`)

4. The clock starts counting up as the instructions close. It shows for the first `visibleSeconds` (3) and then hides. One big round stopwatch button, **Stop**: tap it when you think `targetSeconds` (7) have passed. Stop counts on the press, and the screen freezes at once, without waiting for the server. The screen repeats no instructions (How to play has them).
5. The result shows your time to the hundredth and how far off you were. Within ±0.1 s earns all the points; it drops linearly to 0 at 3 s off. A run not stopped within the target plus 10 s scores 0.

### Tap Masher (`taps`)

6. A 3-2-1 countdown starts as the instructions close (no instruction line on the screen; How to play has it), then `seconds` (5) of tapping a big target anywhere in the play area. The count shows live.
7. Points scale with taps up to `target` taps (50) for all of them; the target is never shown. More than 20 taps a second isn't accepted.
7a. Film option (Khai, 2026-11-14): content `film` is a video cut into frames on one sprite sheet (`sheet`, `frames`, `columns`, one frame's `width` and `height`, `alt`, and optional `who`, default "Coach"). The frames are the target, and every tap plays the next frame above a shorter tap button, with a progress bar and a count of moves done out of all of them (the answer is all the frames, so it shows). The instructions open with "Help Coach finish the form!". The countdown waits until the sheet has loaded. The last frame ends the run at once with "Form complete!", and the server accepts that early finish only once the frames could have been tapped at 20 a second. A film can't have more frames than `seconds` × 20, so every frame is reachable. A video has far more frames than anyone can tap, so `scripts/film-sheet.sh` samples it evenly. At the party: Coach's spear form from the 2009 Team Trials, 50 frames in 5 s (Khai's existing 50-tap pace), 320 × 240 each, one 0.5 MB sheet.

### Pathfinder (`trail`)

8. Our own path puzzle, not a copy of any app's, with a name that suits any event: a `size`×`size` grid (7) with `checkpoints` numbered dots (8). Draw one path by dragging (or tapping square by square) from 1, through every square exactly once, passing the dots in order and ending on the last. Drag back to undo; **Clear** starts over.
9. Every play makes a new puzzle from the play's seed, built from a real path through the whole grid, so it always has a solution.
10. The server checks the path. Solving earns half the points, plus up to half for speed: all of it within 15 s, none at 90 s. There is no time limit: an unsolved run stays open.

### Stack Attack (`stacker`)

11. The bar starts as the instructions close. A bar slides side to side across a `width`-square row (7). Tap anywhere on the screen (not just the board) to stop it; the part that overhangs the row below falls away and the next bar is that wide, a row higher, and a little faster. The game ends when a bar misses completely or after `rows` rows (12).
12. Points scale with rows stacked (all of them for all rows). The phone runs the game; the server accepts a row count up to `rows`.

### Rapid Recall (`recall`)

13. Three rounds, each harder: a 4×4 grid with 5 squares lit, 5×5 with 8, 6×6 with 11 (from `rounds`). The squares light for 1.2 s (`showMs`), then go dark; tap the squares you remember. A round ends when you've tapped as many squares as were lit.
14. The pattern comes from the play's seed; the server checks every pick. Points: an equal share for each lit square found.

## Data

Each play's `state` holds that game's run (start time, taps, path, picks, rows), step counter and result. No new collections.

## UI

Phone, in the pack: one big primary action per screen, the game's numbers in the display font, results held up on the pack's score card (spec 08). Pathfinder is built to read in a dim room: light empty squares, squares on the trail filled with the accent, a thick light trail line, large white numbered chips, and the trail's end ringed.

## Acceptance criteria

- [x] AC-1: Each game's content is validated, with defaults for the party, and its instructions are built from it.
- [x] AC-2: T-Timer shows the clock for the visible seconds, then hides it; the score is all points within ±0.1 s of the target, falling to 0 at 3 s off, and the server refuses a claimed time longer than really passed.
- [x] AC-3: Tap Masher counts taps for its seconds after a countdown; points scale to the target and an impossible count is refused.
- [x] AC-4: Pathfinder makes a different puzzle per seed that always has a solution; the server accepts only a path that covers every square once, moves between neighbours and passes the dots in order, and scores half for solving plus up to half for speed, with no time limit.
- [x] AC-5: Stack Attack trims each stopped bar to the row below, ends on a miss or the top row, and scores by rows stacked.
- [x] AC-6: Rapid Recall plays three rounds of growing grids from the seed, hides the pattern after 1.2 s, and scores an equal share per square found.
- [x] AC-7: The party's event file lists the five games, and each plays end to end on a phone.
- [x] AC-8: With a film, the frames are the target, the phone gets the film, the instructions open with "Help Coach finish the form!", and tapping every frame ends the run early when a person could have tapped that fast; a film with more frames than the seconds allow is refused.
- [x] AC-9: The phone waits for the film's frames before the countdown, shows the frame for each tap with progress, ends on the last frame, and keeps it up while the result holds.

## Tests

- Unit: each game's `logic.test.ts` (rules, scoring, refusals; fake clock and seed), the Pathfinder generator over many seeds, the Stack Attack trimming.
- Component: each renderer's main states.
- E2E: one run of each game on a phone.

## Out of scope

- Guessing Jar and Geocache (spec 17), Color Matcher and Quick Draw (spec 18).
- Leaderboards per game.
