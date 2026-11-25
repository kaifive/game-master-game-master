# 29: Team colors chosen by the captain

**Status:** Done (agreed with Khai 2026-11-19)
**Backlog:** M4
**Depends on:** 03, 09, 24

## Summary

Today a new team gets the next color in order (S03-AC2). Khai wants the captain
to choose the team's color when they name the team, and that color is the
team everywhere: the board, the TV, every showdown, Who's played and toasts.
Once built, spec 03 changes to match.

## User stories

- As a captain, I want to pick our team's color when I name us, so the team feels like ours.
- As a player, I want my team's color to be the same in every game, so I can spot us at a glance on the TV.

## Behavior

1. The palette is the theme's seven team colors (`team-1` to `team-7`), each with a
   plain name the theme gives it, such as Red, Blue, Gold, Green, Purple, Teal
   and Orange. With at most 6 teams (spec 03), there's always a color free.
   Slate is gone (it read as the grey "no answer"), and Orange is bright enough
   not to pass for Red (Khai, 2026-11-25).
2. When the captain names the team (S03-AC2), they also pick its color. Every
   color is offered as a swatch with its name. Colors another team holds are
   shown taken, with that team's name, and can't be picked. The next free color
   is picked to begin with, so a captain who skips it gets one as today.
3. No two teams in an event share a color. If two captains pick the same free color
   at the same moment, the first one saved keeps it; the other's phone says
   "Jade Tigers just took Blue" and asks again.
4. Once saved, the color is fixed for the event: nobody changes it, captain or
   host (Khai, 2026-11-19).
5. The team's color is the one every surface already reads (`team.color`): the
   leaderboard, the TV's racing bars and toasts, the Pick your team list,
   Who's played, and every showdown's swatches, lock-in row, reveal and marks
   on a scene (specs 24 to 28). No game assigns its own team colors.
6. Color is never the only signal: the team's name is always beside its color
   (PRODUCT.md), so a color-blind player loses nothing.
7. Game colors that aren't teams, such as Fly-by Count's presents, keep their own
   patterns and names, so they never read as a team.

## Data

- `events/{slug}/teams/{teamId}.color` stays 1 to 8; the captain's pick replaces
  the one given at creation, once, when the team is named. A transaction keeps
  colors unique per event.
- Each style pack names its seven team colors (`teamColorNames`, spec 09); the
  pack schema requires all seven. The admin theme names them too.

## Routes and real-time

- The team naming request (spec 03) takes `color` too, and refuses a color
  that's taken ("That color's taken"). There's no request to change it later.
- Phones and the TV pick up the new color on their next poll (within 15 s).

## UI

- **Captain's phone (name the team):** the name field, then a 4 × 2 grid of color
  swatches (at least 64 px tall, the color's name under each, a check and a ring on
  the picked one, taken ones faded with the holding team's name), then Name the team.
- **Team tab and Controls:** the team's swatch and color name, not editable.

## Edge cases

- A captain who never names the team keeps the color they were given at creation.
- The host moves the captain role: the color stays with the team.
- A team is removed: its color is free again.

## Acceptance criteria

- [x] AC-1: Naming a team takes a color from the theme's seven, offered with names; colors other teams hold are shown taken and can't be picked; the next free color is picked to begin with.
- [x] AC-2: No two teams in an event share a color, even when two captains pick at once.
- [x] AC-3: Once saved, a team's color can't be changed.
- [x] AC-4: Every surface and every showdown shows the team in its chosen color, always beside its name.

## Tests

- Unit: picking, taken colors, the race (two captains, one color), no change after saving.
- Component: the swatch grid (names, taken, picked) on the captain's phone.
- E2E: a captain names the team and picks Teal; the TV board and a showdown show Teal.

## Out of scope

- Custom colors outside the theme's seven (they couldn't be checked for contrast).
- Team logos or icons.

## Open questions

- None. A59 in `OPEN_QUESTIONS.md`: one color, no changing after.
