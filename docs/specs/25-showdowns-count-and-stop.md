# 25: Showdowns: count and stop games (Fly-by Count, Snow Sum, Color Count, Blind Stop, Last Second)

**Status:** Done (blind-reviewed 2026-11-18: `docs/reviews/showdowns.md`)
**Backlog:** M3
**Depends on:** 11, 24

## Summary

Five showdowns where every team answers at once: count the presents that fly by, keep a running snowflake sum, count one color you only learn at the end, stop a hidden clock at 10.00, and stop a visible countdown as late as you dare.

## Behavior

Every game here follows spec 24: the host's steps, Who's played, the TV demo, 1 to 6 teams, fair play (shared leads, shared clock starts, secret answers), points to teams through the ledger, a mock play-test suite and a blind review.

### Fly-by Count (`flyby`)

1. Content: `rounds`, each with a count range, how long the fly-by lasts and the grid size; defaults are 3 rounds that get harder (6 to 12 presents over 4 s, 10 to 18 over 3.5 s, 15 to 25 over 3 s). The layout comes from the session's seed; the count is never sent to phones before the reveal.
2. Play: the presents fly across the TV in rows and columns with gaps (some rows offset). When they've passed, every team's player types a number on the captain's phone and taps Lock in, within 10 seconds.
3. Results: the TV replays the fly-by slowly, counting up, then shows each team's number. **Points per round: exactly right 100, one off 50, otherwise 0.**

### Snow Sum (`snowsum`)

1. Content: rounds (default 3), each with how many snowflakes and which operations, getting harder (5 flakes of + and −, 7 flakes, then 8 flakes with ×2), dealt from the seed. Totals stay between −50 and 200.
2. Play: the snowflakes fall one at a time on the TV, starting from 0. A flake never takes away from 0 or less, so totals stay friendly for kids. When the last has fallen, every team types the total within 10 s and locks it in.
3. Results: the TV replays the sum step by step. **Points per round: exactly right 100, one off 50, otherwise 0.**

### Color Count (`colorcount`)

1. Content: rounds (default 3), getting harder: 3 colors and 12 ornaments over 4 s, 4 colors and 18 over 3.5 s, 5 colors and 24 over 3 s; dealt from the seed.
2. Play: ornaments of different colors flash on the TV, a few at a time. Each color also has its own pattern (stripes, dots, zigzag, star, rings), so color isn't the only way to count. Only when they're done does the TV ask "How many **red**?" (one color picked from the seed), so teams have to keep track of every color. Every team types a number within 10 s.
3. Results: the TV replays the flashes with that color highlighted and counted. **Points per round: ranked by closeness: 100, 70, 50, 30, then 10; exact gets the top place even if alone; ties share.**

### Blind Stop (`blindstop`)

1. Content: target (default 10.00 s), seconds the clock shows before turning into "?" (default 3). Several rounds (default 1; the host can run it again).
2. Play: the TV shows a big clock counting up from 0.00. After 3 s the numbers become a "?" while it keeps running. Every team's player taps Stop on the captain's phone. Each phone times its stop from the shared start (spec 24, shared start), to the hundredth, and sends it; the server checks it's plausible against its own clock, as T-Timer does (spec 16). A phone that hasn't stopped by 20 s counts as no answer.
3. Results: the TV reveals every team's time, closest first. **Points: ranked by how close to 10.00: 100, 70, 50, 30, then 10 for every team after; an exact 10.00 gets a 50 bonus.** Ties share the place.

### Last Second (`lastsecond`)

1. Content: rounds (default 3), countdown length (default 10 s).
2. Play: a big countdown runs on the TV, fully visible (Khai, 2026-11-17), from 10.00 to 0.00. Each team's player taps **Stop** on the captain's phone whenever they dare. Each phone times its stop from the shared start (spec 24, shared start), to the hundredth, like Blind Stop. A team that hasn't stopped by zero has busted.
3. Results: the TV shows every team's stop time, latest first, and the busts. **Points per round: ranked by how late they stopped before zero: 100, 70, 50, 30, then 10 for every other team that stopped; a bust scores 0.** Ties share the place.

## Data

Each game's content is validated in the event file and its round state lives in the live session (spec 11). Seeds come from the session, so a round can be replayed in tests.

## UI

- **TV:** the round as described above, then the reveal with every team's answer and points.
- **Captain phone:** one clear control for the round; locked and waiting states.
- **Demo:** each game's looping TV demo and one line of text (spec 24).

## Acceptance criteria

- [x] AC-1: Fly-by Count deals rounds from the seed, never sends the count early, takes one locked-in number per team within 10 s, and scores exact 100, one off 50, else 0.
- [x] AC-2: Snow Sum deals harder seeded snowflake sums each round, takes one locked-in total per team within 10 s, and scores exact 100, one off 50, else 0.
- [x] AC-3: Color Count flashes seeded colored ornaments, asks for one color only at the end, takes one number per team within 10 s, and ranks by closeness: 100, 70, 50, 30, then 10, ties sharing.
- [x] AC-4: Blind Stop shows the clock for 3 s then a "?", takes each team's phone-timed stop, and ranks by closeness to 10.00: 100, 70, 50, 30, then 10, with a 50 bonus for exactly 10.00 and ties sharing.
- [x] AC-5: Last Second runs a visible countdown, takes each team's phone-timed stop, busts teams that didn't stop by zero, and ranks the rest by how late they stopped: 100, 70, 50, 30, then 10, ties sharing, busts 0.

## Tests

- Unit: each game's dealing and scoring from a seed, and its edge rules.
- Play tests: `lib/live/games/playtest.test.ts` on spec 24's bot harness: 1, 2, 3, 4, 5 and 6 teams; perfect, random, cautious, reckless, silent, late and dropped-out teams; ties. Each answer type also gets a no-answer and an out-of-range case.
- Component: the TV view and the phone controller for each game.
- E2E: a whole Fly-by Count round with two captain phones, the TV and Controls (`e2e/showdowns.spec.ts`). The other four share its answer and stop pieces, which the component tests cover.
- Gallery: `/dev/ui/showdowns?game=<type>&moment=<intro|ready|show|answer|results|final>&on=<tv|phone>&teams=<1-6>` freezes any round on the real logic, for looking and for the blind review.
- Blind review: findings and fixes in `docs/reviews/showdowns.md`.

## Out of scope

- Other showdown types (`docs/reference/game-ideas.md`).
