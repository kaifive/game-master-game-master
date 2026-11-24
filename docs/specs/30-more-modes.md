# 30: Second modes: solo Fly-by Count and Snow Sum

**Status:** Done (agreed with Khai 2026-11-19, ADR-041)
**Backlog:** M3
**Depends on:** 18, 24, 25, 28

## Summary

ADR-041 gives a game a second mode only where it plays well that way. Khai
agreed four: Color Matcher as a showdown, and Fly-by Count, Snow Sum and Color
Count as solo games. Color Count was merged into Fly-by Count (ADR-043), and the
Color Matcher showdown was removed after play-testing (ADR-044): solo Color
Matcher stays. Each is built like the perception games (spec 28): one
core deals a task by level and scores how close an answer is, and the solo
and showdown versions are made from it.

## User stories

- As a player, I want to play Fly-by Count and Snow Sum on my own phone when no showdown is on.

## Behavior

### Fly-by Count and Snow Sum as solo games (`mode: "solo"`)

(Color Count had a solo version too, until it was merged into Fly-by Count: ADR-043.)

7. Each plays like its showdown (spec 25), on the player's phone: three rounds at
   the showdown's three default levels, each shown and then answered within 10 s.
   It starts after the 3-2-1 like the other timed games.
8. How close, for each round, by the showdown's own rule:
   - Fly-by Count and Snow Sum: exact counts 1, falling away evenly to 0 at a miss of half the true number (at least 5).
9. Points: the game's points times the average over the three rounds, rounded. No
   answer in time counts 0. After each answer the phone holds up how close it was.
10. What gives the answer away (the presents, the snowflakes, the ornaments) shows only
    during the show; which kind of present Fly-by asks about only after it (S28-AC4).

## Data

- No new content: the solo counting games use the showdowns' default rounds.
- The dealing for Fly-by Count and Snow Sum moves into `lib/games`
  so the solo and showdown versions share it; the showdowns keep their content.
- An event file's game content is checked against the version the entry runs:
  a `live` entry against the showdown's content, a `solo` one against the solo
  game's.

## UI

- **Solo counting games, phone:** the showdown's own pictures (the flying presents,
  the falling snowflakes) sized for the phone, then the number pad (with a minus
  key for Snow Sum) and Lock in, then how close each answer was.

## Acceptance criteria

- Retired with the Color Matcher showdown (ADR-044): AC-1.
- [x] AC-2: Fly-by Count and Snow Sum each run solo: three rounds, shown then answered, scored by their showdown's own rule, points times the average.
- [x] AC-3: Nothing that gives a solo counting game's answer away reaches the phone outside its show.
- [x] AC-4: The game library lists Fly-by Count and Snow Sum as solo or showdown, and an event file's game content is checked against the version it runs.

## Tests

- Unit: each core's dealing by level and how close; the shared dealing still gives the showdowns the same rounds.
- Component: each solo counting game's show and number pad.

## Out of scope

- Any other game's second mode (ADR-041).
