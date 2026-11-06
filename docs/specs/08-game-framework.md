# 08: Game framework

**Status:** Done
**Backlog:** M2
**Depends on:** 01, 02

## Summary

The contract every game type follows (ADR-007): pure logic, a content shape, and a themeable renderer. Scored solo games run their logic on the server through one shared move route, so answers never reach the phone. Trivia (spec 10) is the first game built on it.

## User stories

- As a player, I want to tap a game on the hub, play it, and see my points.
- As Khai, I want to add a new game type without touching the others.

## Behavior

1. A game type lives in `lib/games/<type>/`: `content.ts` (zod schema for the event file's `content`), `logic.ts` (pure), and a renderer in `components/games/<type>/`. The registry (`lib/games/registry.ts`) maps `type` to it. Event files are checked against each game's content schema at build time (spec 01's validator).
2. The logic contract (`GameLogic`):
   - `create(content, ctx)` → the starting state. `ctx` gives `seed` and `now` (ms), so logic stays pure and testable.
   - `view(state, ctx)` → what the phone may see. Never contains answers that haven't been played.
   - `move(state, move, ctx)` → the next state, or an `invalid` result with a message.
   - `isOver(state)`, and `score(state, scoring)` → points earned.
3. A play is one player's run at one game: `plays/{gameId}_{playerId}` (`reference/data-model.md`). The server owns its state.
4. **One play per player per game**, unless the game is `replayable`: then **Play again** starts a new run, and the player's score for the game is their **best** run; a worse run never lowers it. Opening a finished game shows your result (with Play again when replayable).
4a. **Instructions first.** Every game opens with an instructions box (the game type's default, or the event file's `instructions` for that game). The play, and any timer, starts only when the player closes it with **Start**. A resumed play skips it.
4b. **Same points for every solo game.** The event file sets `soloGamePoints` (the party uses 100); every solo game is worth that, and a solo game may not set its own `scoring.points`. A game's score is its share of those points.
5. Leaving mid-game and coming back resumes the same play. Anything timed keeps running while you're away.
6. **Score once:** when a play ends, its points are fixed and `scored: true` is set in the same transaction. Spec 04 turns that into a ledger award; until spec 04 ships, the points show on the result screen only.
7. A game is playable while the event is `live`, or before the start too when the game is `alwaysOpen` (for testing or warm-ups), by a player on the calling device. Every game closes when the event ends. Before the start it shows "This game opens when the host starts the party."; after the end, "This game has closed."
8. The hub's game list shows each game as **Play**, **Continue** (started), **Done · +N** (finished), **Best N · Again** (finished, replayable) or **Locked** (not open), for the active player.
10. **Footer:** every event page has a bottom bar with the active player (to the hub's player switcher) and **Games**. Leaving a run in progress asks first: the clock keeps running, so the current question may count as wrong.
11. **Header total:** the event banner shows the active player's total, the sum of their best scores (until spec 04's ledger), instead of the Live badge. When a run sets a new best, a "+N" chip flies from the score to the total, which then counts up. Under reduced motion it just updates.
9. The game page shows which player is playing and lets the hub's switcher change it.

## Data

- `events/{slug}/plays/{gameId}_{playerId}`: `playerId`, `deviceUid`, `gameId`, `seed`, `state` (game type's, as JSON text), `status: "playing" | "finished"`, `points` (this run), `best` (best finished run), `runs`, `scored`, `startedAt`, `finishedAt`.
- Game config adds `replayable?: boolean` and `alwaysOpen?: boolean`.
- Every move is a Firestore transaction on the play document, so a double tap can't apply twice: each move carries the step it answers (`step`), and a move for an old step is ignored and returns the current view.

## Routes

All need the device token (spec 02) and an active player on that device.

- `GET /api/events/[slug]/plays?playerId=` → `{ plays: { [gameId]: { status, points } } }` for the hub.
- `POST /api/events/[slug]/games/[gameId]/play` with `{ playerId, again? }` → starts or resumes the play (`again` starts a new run of a finished replayable game): `{ view, status, points, best, step }`.
- `POST /api/events/[slug]/games/[gameId]/move` with `{ playerId, step, move }` → `{ view, status, points }`.
- Errors: `403 FORBIDDEN` (event not live, not this device's player), `404 NOT_FOUND` (event, game, player), `400 BAD_REQUEST` (invalid move).

## UI

Player phone, in the event's pack: game header (title, "Playing as"), the instructions box, the game's renderer, and a result screen where the points count up from 0 to the final score (`CountUp`, spec 14; instant under reduced motion). Back to the hub at any time.

## Edge cases

- Double tap: the step check makes the second move a no-op.
- Two phones, same player: impossible, players live on one device.
- Reload mid-question: resumes; the timer didn't stop.
- Event ended mid-play: further moves are refused; points already fixed stay.

## Acceptance criteria

- [x] AC-1: Every game in an event file is validated against its type's content schema, with errors naming the file, game and field.
- [x] AC-2: The move route runs the game's logic on the server; the phone's view never contains an answer it hasn't played.
- [x] AC-3: A player has one play per game unless it is replayable: starting again resumes an unfinished run, and a finished play shows its result instead of a new game.
- [x] AC-4: A play's points are fixed once, when it ends (`scored: true`), and never change after.
- [x] AC-5: A move for an old step (double tap) changes nothing and returns the current view.
- [x] AC-6: Games can be played only while open, by a player on the calling device.
- [x] AC-7: The hub lists each game as Play, Continue, Done · +N or Locked for the active player.
- [x] AC-8: The memory and Firebase play repos pass the same contract.
- [x] AC-9: Every game opens with an instructions box (the type's default or the event's own), and the play and its timer start only when it is closed with Start; a resumed play skips it.
- [x] AC-10: Every solo game is worth the event's `soloGamePoints`; an event file that sets points on a solo game fails validation.
- [x] AC-11: The result screen counts the points up from 0 to the final score.
- [x] AC-12: A replayable game offers Play again, which starts a new run; the game's score is the best run, never lowered by a worse one.
- [x] AC-13: An `alwaysOpen` game can be played before the event starts; every game closes when it ends.
- [x] AC-14: Event pages have a footer with the active player and Games; leaving a run in progress asks first.
- [x] AC-15: The header shows the active player's total (sum of best scores) instead of the Live badge; a new best flies from the result to the total, which then counts up (instant under reduced motion).

## Tests

- Unit: registry and content validation, the play service with memory repos and a fake clock.
- Contract: `lib/games/repo.contract.ts` against memory and Firestore emulator.
- Component: hub game states, game page shell.
- E2E: join, play trivia to the end, see the result, reopen it. E2E runs without Firebase; a `gm-dev-status` cookie sets an event's status, honored only by the in-memory backend.

## Out of scope

- Ledger awards (spec 04), team awards and `awardTo: "team"`.
- Open and close times, and the admin opening or closing a game (spec 07).
- Game codes, hidden games and scavenger hunts: spec 15.

## Open questions

- None open.
