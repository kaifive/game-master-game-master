# 11: Live session engine

**Status:** Done
**Backlog:** M3
**Depends on:** 03, 04, 06

## Summary

The engine for games the host runs for the whole room at once, on the TV, with captains' phones as controllers. Showdowns (specs 24 to 27) are the first; Jeopardy (spec 12) comes later on the same engine. One live session runs per event at a time. The server owns its state and moves it through a pure state machine; the TV, Controls and phones poll a view of it about once a second and share the server's clock, so a round starts at the same moment everywhere (ADR-037).

## User stories

- As the host, I want to start a live game from Controls, step it along, and end it, and pick up where I was if I reload.
- As a captain, I want my phone to follow the game within a second and send my team's moves.
- As anyone, I want the TV to follow the game, and a round's start to land at the same moment on every screen.

## Behavior

1. **A live session** belongs to one event and runs one live game (a game in the event file with `mode: "live"`). The host starts it from Controls by picking the game. Only one session runs at a time: starting another while one runs is refused. The host can end it at any time.
2. **State.** The session holds: its id, the game id and type, the step, the round number and count, a seed, the teams taking part (from the event's teams when it starts), each team's player for the round, timing (`startsAt` and `deadline`, server epoch ms), the game's own state, and a revision number that goes up on every change.
3. **State machine.** A pure function moves the session: `next` (the host's Next), `move` (a captain's move), `tick` (time passing: turn timeouts, answer windows). Each game type plugs in through one interface (deal a round, given the last round's final state for games that carry something forward; accept a move; tick; settle anything unanswered when the round closes; score a round; and build each role's view). Invalid transitions are refused with a reason.
4. **Views per role.** `GET /api/events/[slug]/live` returns the view for the caller: the **TV** (no player), a **captain** (their team's controls and whatever they're allowed to know), or a **member** (Watch the TV and their team's status). Every view includes the server's current time. Nothing secret (answers not yet revealed, the next card or stocking, a path that's hidden) is in any view before it should be.
5. **Following along.** The TV, Controls and phones poll the view about every 700 ms while a session runs and every 4 s otherwise, and pause while their tab is hidden. A reload picks up the current state.
6. **Shared clock.** Each device estimates its offset from the server's clock from the view replies (the time sent, received and the server's time; keeping the reply with the shortest round trip), and shows timers against that clock. A round starts at `startsAt`, a moment about 3 s ahead, so every device has the start in hand before it happens.
7. **Moves.** `POST /api/events/[slug]/live` with the player and a move. The server checks the player is their team's captain, that the step and round match, and that the move arrived inside its window by the server's clock; then applies it through the state machine. A move for an old round changes nothing.
8. **Host steps.** A game can also take the host's own steps inside a round from Controls (`POST /api/admin/events/[slug]/live` with `action: "host"`), give Controls a view of its own (which may hold the answer), and skip the results step, so Next pays the round and starts the next (spec 12's buzzer round).
9. **Points** for a round are paid when its results step is reached (or, in a game that skips it, when Next closes the round), to teams through the ledger, with ids made from the session, round and team so a repeated step can't pay twice.
10. **Storage.** The session lives at `live/{slug}` in Realtime Database (written only by the server; phones never read it directly), with an in-memory store of the same contract for dev and tests.

## Data

- RTDB `live/{slug}`: one JSON string holding `{ session, played, screen }`: the session (step, round, seed, teams, timing, game state, revision, and the captains' proven phones), spec 24's Who's played (per team: people added by name and everyone marked played), and the TV screen (`leaderboard` or `showdown`). One value, so every change is one transaction. Ending a session clears `session` and keeps the rest.
- Ledger entries `live_{sessionId}_{round}_{teamId}` (spec 04).

## Routes and real-time

- `POST /api/admin/events/[slug]/live`: `{ action: "start", gameId }`, `{ action: "next" }`, `{ action: "end" }`, `{ action: "screen", screen }`, and Who's played: `{ action: "played", teamId, personId, played }`, `{ action: "add", teamId, name }`, `{ action: "remove", teamId, personId }`, `{ action: "reset", teamId }`. Admin only. Returns the Controls view.
- `GET /api/events/[slug]/live?playerId=...`: the caller's view, with `serverNow`. No playerId: the TV view.
- `POST /api/events/[slug]/live`: `{ playerId, round, action: "move", move }`. Captain only. Returns the captain view.
- Polling as in behavior 5; no Realtime Database listeners on phones (ADR-037).

## UI

- **Controls:** a Live card: the TV screen switch, pick a live game and Start; while one runs, the step, what Next will do, Next, End, and each team's points; and spec 24's Who's played.
- **TV:** the display has a leaderboard screen and a live screen; the host switches between them, and starting a session switches to the live screen (spec 24, AC-9).
- **Phones:** when a showdown starts, every joined phone goes to it on its own, once per showdown: captains get the game's controller, members Watch the TV. A phone in the middle of a solo game isn't pulled out; it gets a "Showdown on now" bar above the tabs instead, as every other page does while the showdown runs (Khai, 2026-11-24: his phone never switched). The TV's pages are left alone.

## Edge cases

- Next tapped twice quickly: the second sees the new revision and does nothing extra.
- A captain's phone offline: its team counts as no answer; reloading rejoins.
- A team made or a captain changed mid-session: the session keeps the teams it started with.
- The host ends a session mid-round: no points for that round; earlier rounds' points stay.

## Acceptance criteria

- [x] AC-1: The host starts a live game from Controls, only one session runs at a time (a second start is refused), and End stops it with earlier rounds' points kept.
- [x] AC-2: A pure state machine moves the session on Next, moves and time, refuses invalid transitions with a reason, and bumps the revision on every change.
- [x] AC-3: The live view is built per role (TV, captain, member), includes the server's time, and never contains a secret before its reveal.
- [x] AC-4: TV, Controls and phones poll about every 700 ms during a session and every 4 s otherwise, pause while hidden, and pick up the current state on reload.
- [x] AC-5: Devices estimate their offset from the server clock from view replies, keeping the shortest round trip, and rounds start at a shared server time about 3 s ahead.
- [x] AC-6: The server accepts a move only from that team's captain, for the current step and round, inside its window by the server clock; a move for an old round changes nothing.
- [x] AC-7: Round points go to teams through the ledger with ids made from session, round and team, so a repeated step never pays twice.
- [x] AC-8: The session store has an in-memory and a Realtime Database backend that pass the same contract tests.

## Tests

- Unit: the state machine with a stand-in game (AC-2, AC-6), views (AC-3), clock offset estimation (AC-5), awards (AC-7), store contract (AC-8).
- Component: the poll and clock hooks (AC-4, AC-5); the Controls Live card (AC-1).
- E2E: start, step and end a live game from Controls, with the TV and two captain phones (AC-1, AC-4), using the first real showdown, Fly-by Count (spec 25), since stand-in games aren't registered in a production build.

## Out of scope

- Jeopardy and buzzing (spec 12).
- Realtime Database listeners on phones.

## Open questions

Q7 (only Jeopardy for the party?) is superseded: showdowns are the party's live games.
