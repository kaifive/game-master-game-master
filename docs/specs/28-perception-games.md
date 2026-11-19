# 28: Perception games (Snow Pile, Staff Angle, Sleigh Run, Lion Drum, Cut the Ribbon)

**Status:** Done (agreed with Khai 2026-11-18)
**Backlog:** M3
**Depends on:** 08, 11, 24

## Summary

Five quick games that test how well you judge what you see: how many, which angle,
where something moving ends up, keeping a beat, and how far along. They're inspired
by perception puzzles like Perceptle (Khai, 2026-11-18), with their own names and the
event's look. Each game can run solo on players' phones or as a team showdown on the
TV; the event file chooses per game (ADR-040).

## User stories

- As a player, I want quick games that reward a sharp eye, with a score that tells me how close I got.
- As the host, I want to run any of these solo or as a showdown, whichever fits the night.

## Behavior

### Every perception game

1. A game deals **tasks** from a seed at a level from 1 (easy) to 3 (hard), and scores an
   answer by **closeness**, from 0 (way off) to 1 (exact). Each game's closeness rule is below.
2. **Solo** (`mode: "solo"`): three tasks in a row, levels 1, 2 and 3. Each task shows,
   then the player answers on their phone within the answer time; after an answer the
   phone shows how close it was ("92% close") for a moment, then the next task starts.
   Points: the game's points times the average closeness, rounded. No answer in time
   counts as 0 for that task. It starts after the 3-2-1 like the other timed games.
3. **Showdown** (`mode: "live"`, spec 24): three rounds, levels 1 to 3. Every team gets
   the same task on the TV and answers on the captain's phone. Points per round: ranked
   by closeness, 100, 70, 50, 30, then 10, ties sharing; no answer scores 0.
4. Answers stay secret until the reveal (S24-AC7); the TV shows who has answered.
   Anything that gives the answer away (the snowflakes, the sleigh's path) shows only
   while it's meant to be seen.
5. Lion Drum times taps on the phone, from the moment the beat starts on that phone
   (solo) or from the shared start (showdown); the server checks the taps are possible
   by its own clock, as T-Timer does (spec 16).

### Snow Pile (`snowpile`)

1. A heap of snowflakes, scattered across the screen, shows for a moment, then hides.
   Type how many there were.
2. Levels: 12 to 25 flakes for 2 s, 25 to 50 for 1.5 s, 50 to 100 for 1.2 s. 10 s to answer.
3. Closeness: 1 minus the miss as a share of the true count (40 for 50 is 0.8), never below 0.

### Staff Angle (`staffangle`)

1. The screen says an angle ("Set the staff at 35°"). The player turns a wushu staff on
   their phone, by dragging or with nudge buttons, and locks it in. There's no number
   on screen to read off while turning, only a flat floor line to judge from.
2. Levels: multiples of 15° (15 to 165), then multiples of 5°, then any whole degree.
   15 s to answer.
3. Closeness: 1 minus the miss in degrees over 45, never below 0 (5° off is 0.89).

### Sleigh Run (`sleighrun`)

1. A sleigh flies in a straight line from the left toward a cloud bank and disappears
   into it. The player taps the cloud's far edge where the sleigh will come out.
2. Levels: a gentle slope and a narrow cloud; steeper and wider; steepest, widest and
   faster. The flight shows for about 2 s; 10 s to answer.
3. Closeness: 1 minus the miss as a share of a quarter of the screen's height, never below 0.
4. The results show the sleigh's real path through the cloud.

### Lion Drum (`liondrum`)

1. A lion-dance drum flashes on every beat for a few beats (no sound: phones stay
   silent), then goes dark. The player keeps tapping in time, one tap per beat, for the
   beats after it goes dark.
2. Levels: 70 to 90 beats a minute, 8 shown and 4 to keep; 90 to 120, 6 shown and 6 to
   keep; 120 to 150, 4 shown and 8 to keep.
3. Closeness: for each beat to keep, the nearest unused tap; the average miss as a share
   of half a beat, taken from 1, never below 0. A missing tap misses by half a beat.

### Cut the Ribbon (`ribbon`)

1. A ribbon stretches across the screen with no marks on it. The screen says a fraction
   ("Cut it one third of the way along"). The player taps where to cut, can move it, and
   locks it in.
2. Levels: halves, thirds and quarters; fifths and eighths; any fraction in tenths, said
   as a percentage ("Cut it 70% of the way along"). 10 s to answer.
3. Closeness: 1 minus the miss as a share of 15% of the ribbon, never below 0.

## Data

Each game's content is validated in the event file: points and the level settings can
be changed. Solo runs keep their state as other solo games do (spec 08); showdown
rounds live in the live session (spec 11).

## UI

- **Phone (solo):** the task, the input, a clear answer timer, and after each answer how
  close it was. The result shows the average closeness.
- **TV (showdown):** the task big enough for the room, who has answered, then the reveal
  with the right answer and each team's drawn on the scene (in its color), each team's
  answer, how close, and the points.
- **Captain phone (showdown):** the same input as solo.
- **Demo:** each game's looping TV demo and one line of text (spec 24).

## Acceptance criteria

- [x] AC-1: Each game deals tasks from a seed at levels 1 to 3 that get harder, and scores answers by closeness from 0 to 1 by its own rule.
- [x] AC-2: Solo runs three tasks, levels 1 to 3, with a show phase and an answer window each, scores the game's points times the average closeness, and counts no answer as 0.
- [x] AC-3: Showdowns run three rounds, levels 1 to 3, every team answering the same task, and rank each round by closeness, 100, 70, 50, 30, then 10, ties sharing, no answer 0.
- [x] AC-4: Nothing that gives an answer away reaches a phone or the TV outside its show time, and answers stay secret until the reveal.
- [x] AC-5: Lion Drum takes phone-timed taps and refuses taps the server's clock says couldn't have happened yet.
- [x] AC-6: The event file can run any perception game solo or as a showdown, and both appear in the game library.

## Tests

- Unit: each game's dealing by level and its closeness rule; the solo and showdown adapters.
- Play tests: the showdown versions on spec 24's harness, 1 to 6 teams, perfect, random, late, silent and dropped-out teams.
- Component: each game's input on the phone, solo and showdown, and the TV views.
- Smoke: every game at every moment on the TV and phones through the dev gallery.

## Out of scope

- Other modes for the existing games: only where they play better (ADR-041, backlog).
