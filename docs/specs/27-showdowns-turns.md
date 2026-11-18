# 27: Showdowns: turn games (Memory Path, Present Shuffle, Snowball to 21, Land Mass)

**Status:** Done (blind-reviewed 2026-11-18: `docs/reviews/showdowns.md`)
**Backlog:** M3
**Depends on:** 11, 24

## Summary

Four showdowns where teams take turns, so who goes first matters and is rotated: cross a path from memory, pick shuffled presents, race to make 21, and claim land with block pieces.

## Behavior

Every game here follows spec 24: the host's steps, Who's played, the TV demo, 1 to 6 teams, fair play (shared leads, shared clock starts, secret answers), points to teams through the ledger, a mock play-test suite and a blind review.

### Turn-based showdowns

1. In the turn-based showdowns (Land Mass, Present Shuffle, Snowball to 21), turns pass on their own inside the game, and the team sends up a new teammate for each turn, tracked by the host in Who's played (spec 24). In Memory Path, one player crosses for the team each round.

### Memory Path (`path`)

1. Content: grid size (default 5 wide × 9 tall), path length (default 12 to 16 steps), how long the path shows (default 6 s), seconds per step (default 5), and the finisher's points (default 150). The path comes from the seed: it starts on the bottom row, moves one square up, left or right at a time, never back on itself, and ends on the top row. It's one clean line: no square touches an earlier one except the square before it, so there are no blocks or forks to puzzle over (blind review).
2. One round per team, each with a new path (spec 24, "Fair for every team"). Show: the path lights up square by square on the TV, then hides. Phones show "Watch the TV" while it lights up and never get the path. Teams cross one at a time; the order rotates each round so every team goes first once (the team going first has nothing lit to learn from).
3. A team's turn: the phone shows the grid; the player taps the next square, starting on the bottom row. Each step must be tapped within the step time. **A wrong square, or running out of time, knocks the team out**; the TV marks how far they got. The squares a team got right stay lit for the teams after them, so each try makes it easier for the next.
4. **Points: only the team that makes it across scores** (150 per round), and the round ends when a team crosses. If every team is knocked out, nobody scores that round. The results show the whole path.

### Present Shuffle (`shuffle`)

1. Content: number of presents (default 9, in a 3 × 3 grid), point values (default 10 to 100, dealt from the seed), seconds shown (default 4), shuffle time (default 5 s, getting faster), seconds per pick (default 15).
2. Show: the presents appear with their points showing, then the lids close and they shuffle around the TV, where everyone can follow them.
3. One round per team (spec 24, "Fair for every team"), each with fresh presents: at least one more present than there are teams. Picking: each team picks one present per round, in turn; who picks first rotates so every team picks first once. On a team's turn the phone shows the presents where they now stand; the player taps one, and the TV opens it: those points go to the team, and the present is gone for everyone. Too slow: no present that round.
4. Presents left over open at the end of the round for show. **Points: the sum of the presents a team picked.**

### Snowball to 21 (`to21`)

1. One round per team (spec 24, "Fair for every team"). A shared snowball count starts at 0. Teams take turns in order, and a different team starts each round, so every team starts once.
2. On its turn a team adds 1, 2 or 3 to the count (a choice that would go past 21 is off), within 10 s; too slow adds 1.
3. **The team that makes the count exactly 21 wins the round: 100 points.**

### Land Mass (`landmass`)

1. Content: board size (default 12 wide × 10 tall), tray size (default 4), seconds per turn (default 30; 20 was too short for four steps, blind review). Pieces are 3 to 5 squares, like Block Fit's, dealt from the seed.
2. One shared board and one shared tray, seen by every team on the TV. Teams take turns round and round; who leads moves one team on each time round, so every team leads as often as the others (spec 24, "Fair for every team").
3. A turn: the team sends up a new teammate, who plays on the captain's phone. They pick a piece from the tray, tap Turn it to turn it, tap the board where the piece's top-left goes (a preview shows green where it fits, red where it doesn't), and tap Place it. Tapping a square is easier than dragging on a 12 × 10 board at phone size. **It can go anywhere it fits**: inside the board and on empty squares only (Khai, 2026-11-17). Placed, it takes the team's color. A new piece comes into the tray in its place. Once a spot is tapped, arrow buttons nudge the piece one square at a time, since board squares are small on a phone (blind review). Out of time: the turn passes with nothing placed.
4. Turns pass on their own inside the game; the host's Next starts it and shows the results.
5. **End:** when no piece in the tray fits anywhere on the board, the tray is swapped for a fresh one; if still nothing fits, the game ends. The check runs as each turn starts. After 200 turns the game ends anyway.
6. Results: the TV shows the board with each team's squares counted. **Points: ranked by squares held: 150, 100, 70, 50, 30, then 10 for every team after.** Ties share the place.

## Data

Each game's content is validated in the event file and its round state lives in the live session (spec 11). Seeds come from the session, so a round can be replayed in tests.

## UI

- **TV:** the round as described above, then the reveal with every team's answer and points.
- **Captain phone:** one clear control for the round; locked and waiting states.
- **Demo:** each game's looping TV demo and one line of text (spec 24).

## Acceptance criteria

- [x] AC-1: Memory Path deals a path from the seed (bottom to top, up/left/right, never doubling back), hides it after showing it, plays one round per team with a new path and an order that rotates so each team goes first once, knocks a team out on a wrong square or a slow step, keeps their right squares lit for the next teams, and pays 150 only to a team that crosses.
- [x] AC-2: Present Shuffle shows seeded values, covers and shuffles them on the TV, plays one round per team with one pick each, first pick rotating so each team picks first once (each picked present gone for everyone, a slow pick getting nothing), and pays the sum of each team's presents.
- [x] AC-3: Snowball to 21 plays one round per team with each team starting one, takes 1, 2 or 3 per turn (never past 21, 1 if too slow), and pays 100 to the team that makes exactly 21.
- [x] AC-4: Land Mass shares one board and a tray of 4 seeded pieces with every team; teams take turns with the lead moving one team on each time round, each turn played by a new teammate; a piece goes anywhere it fits with no overlap, takes the team's color, and is replaced in the tray; a turn times out after 30 s; the tray swaps once when nothing fits and the game ends when still nothing fits; points are ranked by squares: 150, 100, 70, 50, 30, then 10, ties sharing.

## Tests

- Unit: each game's dealing and scoring from a seed, and its edge rules.
- Play tests: `lib/live/games/turns.test.ts` on spec 24's bot harness: 1, 2, 3, 4, 5 and 6 teams; perfect, random, cautious, reckless, silent, late and dropped-out teams; ties. Every run also checks each team led the same number of times.
- Component: the TV view and the phone controller for each game.
- E2E: covered by the shared showdown e2e (`e2e/showdowns.spec.ts`) for the engine; turn games wait on every team's turn, so their controls are covered by component tests instead.
- Gallery: `/dev/ui/showdowns?game=path|shuffle|to21|landmass&moment=…&on=phone&as=t2` shows any team's phone mid-turn.
- Blind review: findings and fixes in `docs/reviews/showdowns.md`.

## Out of scope

- Other showdown types (`docs/reference/game-ideas.md`).
