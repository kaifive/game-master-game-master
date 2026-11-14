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

4. The clock starts counting up as the instructions close and shows the whole time, to the hundredth (Khai, 2026-11-14: it's a reflex game now, not a counting one). A **Target** chip under it shows the window, `fromSeconds` to `toSeconds` (1.20 to 1.25). One big round stopwatch button, **Stop**: tap it inside the window. Stop counts on the press, and the screen freezes at once, without waiting for the server. The clock keeps its color either way (Khai, 2026-11-14); the result says whether the stop was in the window. The phone sends the time its clock shows (cut to the hundredth), so what the player sees is what's judged; network lag would swamp a 50 ms window, so the server doesn't time the stop itself.
5. The result says "Stopped at 1.23" and either "in the window!" or how far early or late. Anywhere in the window, edges included, earns all the points; outside, they drop linearly to 0 at 0.5 s from the nearest edge. A run not stopped within the window's end plus 10 s scores 0.

### Tap Masher (`taps`)

6. A 3-2-1 countdown starts as the instructions close (no instruction line on the screen; How to play has it), then `seconds` (5) of tapping a big target anywhere in the play area. The count shows live.
7. Points scale with taps up to `target` taps (50) for all of them; the target is never shown. More than 20 taps a second isn't accepted.
7a. Film option (Khai, 2026-11-14): content `film` is a video cut into frames on one sprite sheet (`sheet`, `frames`, `columns`, one frame's `width` and `height`, `alt`, and optional `who`, default "Coach"). The frames are the target, and every tap plays the next frame above a shorter tap button, with a count of moves done; no progress bar and never the total, so players tap blind as fast as they can (Khai, 2026-11-14). The instructions open with "Help Coach finish the form!". The countdown waits until the sheet has loaded. The last frame ends the run at once with "Form complete!", and the server accepts that early finish only once the frames could have been tapped at 20 a second. A film can't have more frames than `seconds` × 20, so every frame is reachable. A video has far more frames than anyone can tap, so `scripts/film-sheet.sh` either samples it evenly or, given a start time, takes consecutive frames (every frame, or every other one) so it plays like video. With a `target` too, the film is just for show: the target scores, the film may have more frames than anyone can tap, and only its last frame ends a run early; `intro` replaces the instructions' first line. At the party it plays like video (Khai, 2026-11-14: skip at most one frame; 50 taps is all the points, the video is styling): every other frame of the first 11.5 s of Coach's spear form from the 2009 Team Trials, 172 frames at 256 × 192, one 1.3 MB sheet, over the usual 5 s, opening with "Help Coach with the beginning movement!". During the 3-2-1 the count shows where the video will play, with the tap button already there but off (reading "Tap!"), so players know where to tap; the video replaces the count when tapping starts (Khai, 2026-11-14).

### Pathfinder (`trail`)

8. Our own path puzzle, not a copy of any app's, with a name that suits any event: a `size`×`size` grid (7) with `checkpoints` numbered dots (8). Draw one path by dragging (or tapping square by square) from 1, through every square exactly once, passing the dots in order and ending on the last. Drag back to undo; **Clear** starts over.
9. Every play makes a new puzzle from the play's seed, built from a real path through the whole grid, so it always has a solution.
9a. Runner (optional content `runner`: `src`, `alt`, `name`, `intro`): a cutout picture that stands on 1 at the start (in place of its chip) and moves to the trail's end as it's drawn, turning to face the last step (up, right, down, left) the short way round; with reduced motion it jumps. The instructions open with `intro` (or "Help <name> hit every number!") and talk about dragging the runner. At the party it's Danny: "Help Danny hit all his jumps!" (Khai, 2026-11-14).
9b. Number chips are grey until the trail passes them in order (green). Reaching a later number before an earlier one skips the earlier one (red); after a skip nothing more turns green until the trail is undone back past it, and undoing turns them grey again. The server's check doesn't change.
9c. Floor option: content `floor: "carpet"` draws the board as a blue competition floor (blue mat squares with dark seams inside a white boundary line); the trail still fills the squares it passes. The party uses it with Danny (Khai, 2026-11-14).
10. The server checks the path. Solving earns half the points, plus up to half for speed: all of it within 15 s, none at 90 s. There is no time limit: an unsolved run stays open.

### Stack Attack (`stacker`)

11. The bar starts as the instructions close. A bar slides side to side across a `width`-square row (7). Tap anywhere on the screen (not just the board) to stop it; the part that overhangs the row below falls away and the next bar is that wide, a row higher, and a little faster. The game ends when a bar misses completely or after `rows` rows (12).
12. Points scale with rows stacked (all of them for all rows). The phone runs the game; the server accepts a row count up to `rows`.
    The bars are wrapped presents (Khai, 2026-11-14), drawn in the event's colors with no image files: a full-width bar (3 squares) is a large box (red paper, gold ribbon), a 2-square bar a medium box (green with polka dots, white ribbon), a 1-square bar a small box (a gold cube, red ribbon). Trimming a bar makes it the next box down, so the tower narrows from big presents to small ones. The box on top of the tower (the sliding one, or the last landed when the run ends) wears a bow.

### Rapid Recall (`recall`)

13. Three rounds, each harder: a 4×4 grid with 5 squares lit, 5×5 with 8, 6×6 with 11 (from `rounds`). The squares light for 1.2 s (`showMs`), then go dark; tap the squares you remember. A round ends when you've tapped as many squares as were lit.
13a. Every square is a wrapped present (Khai, 2026-11-14): plain while hidden, bright red with a gold bow when lit or picked, then gold for right and red for wrong when the round ends.
14. The pattern comes from the play's seed; the server checks every pick. Points: an equal share for each lit square found.

## Data

Each play's `state` holds that game's run (start time, taps, path, picks, rows), step counter and result. No new collections.

## UI

Phone, in the pack: one big primary action per screen, the game's numbers in the display font, results held up on the pack's score card (spec 08). Pathfinder is built to read in a dim room: light empty squares, squares on the trail filled with the accent, a thick light trail line, large numbered chips (grey, green when passed, red when skipped), and the trail's end ringed.

## Acceptance criteria

- [x] AC-1: Each game's content is validated, with defaults for the party, and its instructions are built from it.
- [x] AC-2: T-Timer always shows the clock and the window; stopping inside the window (edges included) earns all points, falling to 0 at 0.5 s outside it; the phone sends the time its clock shows, and the server refuses a claimed time longer than really passed.
- [x] AC-3: Tap Masher counts taps for its seconds after a countdown; points scale to the target and an impossible count is refused.
- [x] AC-4: Pathfinder makes a different puzzle per seed that always has a solution; the server accepts only a path that covers every square once, moves between neighbours and passes the dots in order, and scores half for solving plus up to half for speed, with no time limit.
- [x] AC-5: Stack Attack trims each stopped bar to the row below, ends on a miss or the top row, and scores by rows stacked.
- [x] AC-6: Rapid Recall plays three rounds of growing grids from the seed, hides the pattern after 1.2 s, and scores an equal share per square found.
- [x] AC-7: The party's event file lists the five games, and each plays end to end on a phone.
- [x] AC-8: With a runner set, the phone gets its picture and the instructions open with its intro and talk about dragging it; without one, they're unchanged.
- [x] AC-9: Number chips are grey, turn green when passed in order, and turn red when a later number is reached first, going back to grey on undo.
- [x] AC-10: The runner starts on 1, follows the trail's end, and turns the short way round to face the last step.
- [x] AC-11: With `floor: "carpet"`, the board draws blue mats inside a white boundary line; without it the board is unchanged.
- [x] AC-12: Stack Attack draws each bar as a present sized by its width (large, medium, small), with a bow on the top box only.
- [x] AC-13: With a film, the frames are the target, the phone gets the film, the instructions open with "Help Coach finish the form!", and tapping every frame ends the run early when a person could have tapped that fast; a film with more frames than the seconds allow is refused.
- [x] AC-14: The phone waits for the film's frames before the countdown, shows the frame for each tap with no progress bar or total, ends on the last frame, and keeps it up while the result holds.
- [x] AC-15: Rapid Recall's squares are presents: plain while hidden, lit ones red with a bow, then gold when right and red when wrong.

## Tests

- Unit: each game's `logic.test.ts` (rules, scoring, refusals; fake clock and seed), the Pathfinder generator over many seeds, the Stack Attack trimming.
- Component: each renderer's main states.
- E2E: one run of each game on a phone.

## Out of scope

- Guessing Jar and Geocache (spec 17), Color Matcher and Quick Draw (spec 18).
- Leaderboards per game.
