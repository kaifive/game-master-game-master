# 30: Second modes: Color Matcher showdown, solo Fly-by Count, Snow Sum and Color Count

**Status:** Done (agreed with Khai 2026-11-19, ADR-041)
**Backlog:** M3
**Depends on:** 18, 24, 25, 28

## Summary

ADR-041 gives a game a second mode only where it plays well that way. Khai
agreed four: Color Matcher as a showdown, and Fly-by Count, Snow Sum and Color
Count as solo games. Each is built like the perception games (spec 28): one
core deals a task by level and scores how close an answer is, and the solo
and showdown versions are made from it.

## User stories

- As the host, I want Color Matcher on the TV, so the whole room sees the color and the teams argue over it.
- As a player, I want to play Fly-by Count, Snow Sum and Color Count on my own phone when no showdown is on.

## Behavior

### Color Matcher as a showdown (`color`, `mode: "live"`)

1. Three rounds, levels 1 to 3. The TV shows a color for a moment, then hides it;
   each captain recreates it on the color wheel and brightness slider and locks in.
2. The colors are dealt from the seed, so no event content is needed: vivid colors
   (shown 3 s), then softer ones (2.5 s), then muted and dark ones (2 s). 15 s to
   answer.
3. How close: the same measure as solo Color Matcher (spec 18): the distance on
   the wheel and the brightness slider, full marks within 0.04, none at 0.5.
4. Points per round: ranked by how close, 100, 70, 50, 30, then 10, ties sharing;
   no answer 0 (as every ranked showdown).
5. The reveal shows the color beside every team's, each with its name and how close.
6. Solo Color Matcher is unchanged: one color the event names (such as the club's
   logo purple), matched from memory.

### Fly-by Count, Snow Sum and Color Count as solo games (`mode: "solo"`)

7. Each plays like its showdown (spec 25), on the player's phone: three rounds at
   the showdown's three default levels, each shown and then answered within 10 s.
   It starts after the 3-2-1 like the other timed games.
8. How close, for each round, by the showdown's own rule:
   - Fly-by Count and Snow Sum: exact counts 1, one off counts a half, anything else 0.
   - Color Count: 1 minus the miss as a share of the true count, never below 0.
9. Points: the game's points times the average over the three rounds, rounded. No
   answer in time counts 0. After each answer the phone holds up how close it was.
10. What gives the answer away (the presents, the snowflakes, the ornaments) shows only
    during the show; Color Count's question only after it (S28-AC4).

## Data

- No new content. The Color Matcher showdown deals its own colors; the solo
  counting games use the showdowns' default rounds.
- The dealing for Fly-by Count, Snow Sum and Color Count moves into `lib/games`
  so the solo and showdown versions share it; the showdowns keep their content.
- An event file's game content is checked against the version the entry runs:
  a `live` entry against the showdown's content, a `solo` one against the solo
  game's (so a Color Matcher showdown needs no target color).

## UI

- **Color Matcher, TV:** the color as a big held-up card ("Remember this color!"),
  then "Match the color!" with the clock and who's in, then the reveal: the color,
  every team's color beside it with its name, and the points.
- **Color Matcher, captain's phone:** "Watch the TV!", then the same wheel, slider
  and swatch as solo, with Lock in.
- **Solo counting games, phone:** the showdown's own pictures (the flying presents,
  the falling snowflakes, the flashing ornaments) sized for the phone, then the
  number pad (with a minus key for Snow Sum), then how close each answer was.

## Acceptance criteria

- [x] AC-1: The Color Matcher showdown deals a color per round from the seed, vivid then softer then muted, shows it only during the show, and ranks teams by the spec 18 distance, 100, 70, 50, 30, then 10.
- [x] AC-2: Fly-by Count, Snow Sum and Color Count each run solo: three rounds, shown then answered, scored by their showdown's own rule, points times the average.
- [x] AC-3: Nothing that gives a solo counting game's answer away reaches the phone outside its show.
- [x] AC-4: The game library lists Color Matcher, Fly-by Count, Snow Sum and Color Count as solo or showdown.

## Tests

- Unit: each core's dealing by level and how close; the shared dealing still gives the showdowns the same rounds.
- Play tests: the Color Matcher showdown on spec 24's harness, 1 to 6 teams.
- Component: the Color Matcher showdown on the TV and phone; each solo counting game's show and number pad.

## Out of scope

- Any other game's second mode (ADR-041).
