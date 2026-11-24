# 25: Showdowns: count and stop games (Fly-by Count, Snow Sum, Blind Stop, Last Second)

**Status:** Done (blind-reviewed 2026-11-18: `docs/reviews/showdowns.md`)
**Backlog:** M3
**Depends on:** 11, 24

## Summary

Four showdowns where every team answers at once: count the presents that fly by (later, only the kind you learn at the end), keep a running snowflake sum, stop a hidden clock at 10.00, and stop a visible countdown as late as you dare. Color Count was merged into Fly-by Count (ADR-043).

## Behavior

Every game here follows spec 24: the host's steps, Who's played, the TV demo, 1 to 6 teams, fair play (shared leads, shared clock starts, secret answers), points to teams through the ledger, a mock play-test suite and a blind review.

### Fly-by Count (`flyby`)

1. Content: `rounds`, each with a count range, how long the fly-by lasts, the grid size and how many kinds of present (1 to 3); defaults are 3 rounds that get harder (6 to 12 presents over 4 s, all one kind; 10 to 18 over 3.5 s in two kinds; 15 to 25 over 3 s in three kinds). The layout comes from the session's seed; the count is never sent to phones before the reveal. A round's answer is never the same as the round before's (Khai, 2026-11-24).
2. Kinds: red with a gold bow, white with a red ribbon, and green with white stripes, so each has a mark besides its color. With one kind the question is "How many presents?". With more, everyone knows from the start it'll ask about one kind, but which one ("How many red presents?") shows only once they've flown past, so teams must count every kind (Khai, 2026-11-24, merging in Color Count).
3. Play: the presents fly across the TV in rows and columns with gaps (some rows offset), sized so every row fits the screen, under "Count the presents!" (or "Count every kind!"). When they've passed, every team's player types a number on the captain's phone within 10 seconds; there's no Lock in: what's typed goes in as the time runs out (spec 24).
4. Results: the TV shows the count ("There were 7 red presents") and each team's number. **Points per round: a round's share of 150 (50 a round over three) times how close: exact scores it all, and it falls away evenly to nothing at a miss of half the true number (at least 5), so near misses still score (ADR-045).**

### Snow Sum (`snowsum`)

1. Content: rounds (default 3), each with how many snowflakes and which operations, getting harder (5 flakes of + and −, 7 flakes, then 8 flakes with ×2), dealt from the seed. Totals stay between −50 and 200.
2. Play: the snowflakes fall one at a time on the TV, starting from 0, under "Do the math!". A flake never takes away from 0 or less, so totals stay friendly for kids. When the last has fallen, every team types the total within 10 s; it goes in as the time runs out.
3. Results: the TV shows the total only, not the working (Khai, 2026-11-24), and every team's answer. **Points per round: a round's share of 150 (50 a round over three) times how close: exact scores it all, and it falls away evenly to nothing at a miss of half the true number (at least 5), so near misses still score (ADR-045).**

### Blind Stop (`blindstop`)

1. Content: target (default 10.00 s), seconds the clock shows before turning into "?" (default 3). Several rounds (default 1; the host can run it again).
2. Play: the TV shows a big clock counting up from 0.00. After 3 s the numbers become a "?" while it keeps running. Every team's player taps Stop on the captain's phone. Each phone times its stop from the shared start (spec 24, shared start), to the hundredth, and sends it; the server checks it's plausible against its own clock, as T-Timer does (spec 16). A phone that hasn't stopped by 20 s counts as no answer.
3. Results: the TV reveals every team's time, closest first. **Three rounds. Points per round: up to 50 for how close the stop is to 10.00, falling away evenly to nothing at 3 s off (8.75 s scores 29), whatever the other teams did (ADR-045).** The round ends as soon as every team has stopped.

### Last Second (`lastsecond`)

1. Content: rounds (default 3), countdown length (default 10 s).
2. Play: a big countdown runs on the TV, fully visible (Khai, 2026-11-17), from 10.00 to 0.00. Each team's player taps **Stop** on the captain's phone whenever they dare. Each phone times its stop from the shared start (spec 24, shared start), to the hundredth, like Blind Stop. A team that hasn't stopped by zero has busted.
3. Results: the TV shows every team's stop time, latest first, and the busts. **Points per round: up to 50 for how late the stop was, the share of the countdown gone (stopping with 1 s of 10 left scores 45); a bust scores 0 (ADR-045).**

## Data

Each game's content is validated in the event file and its round state lives in the live session (spec 11). Seeds come from the session, so a round can be replayed in tests.

## UI

- **TV:** the round as described above, then the reveal with every team's answer and points.
- **Captain phone:** one clear control for the round; locked and waiting states.
- **Demo:** each game's looping TV demo and one line of text (spec 24).

## Acceptance criteria

- [x] AC-1: Fly-by Count deals rounds from the seed, never sends the count early, takes one number per team within 10 s (sent as the time runs out), and scores up to 50 a round on how close it is, near misses too.
- [x] AC-2: Snow Sum deals harder seeded snowflake sums each round, takes one total per team within 10 s (sent as the time runs out), and scores up to 50 a round on how close it is.
- [x] AC-3: Fly-by Count's later rounds mix red, white and green presents, each with its own mark, ask about one kind only once they've flown past, and never repeat the last round's answer.
- [x] AC-4: Blind Stop plays three rounds, shows the clock for 3 s then a "?", takes each team's phone-timed stop, and scores each stop up to 50 on its own closeness to 10.00, nothing at 3 s off.
- [x] AC-5: Last Second runs a visible countdown, takes each team's phone-timed stop, busts teams that didn't stop by zero, and scores the rest up to 50 a round on how late they stopped, busts 0.

## Tests

- Unit: each game's dealing and scoring from a seed, and its edge rules.
- Play tests: `lib/live/games/playtest.test.ts` on spec 24's bot harness: 1, 2, 3, 4, 5 and 6 teams; perfect, random, cautious, reckless, silent, late and dropped-out teams; ties. Each answer type also gets a no-answer and an out-of-range case.
- Component: the TV view and the phone controller for each game.
- E2E: a whole Fly-by Count round with two captain phones, the TV and Controls (`e2e/showdowns.spec.ts`). The other three share its answer and stop pieces, which the component tests cover.
- Gallery: `/dev/ui/showdowns?game=<type>&moment=<intro|ready|show|answer|results|final>&on=<tv|phone>&teams=<1-6>` freezes any round on the real logic, for looking and for the blind review.
- Blind review: findings and fixes in `docs/reviews/showdowns.md`.

## Out of scope

- Other showdown types (`docs/reference/game-ideas.md`).
