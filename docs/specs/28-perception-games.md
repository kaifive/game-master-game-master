# 28: Perception games (Staff Angle, Cut the Ribbon)

**Status:** Done (agreed with Khai 2026-11-18)
**Backlog:** M3
**Depends on:** 08, 11, 24

## Summary

Two quick games that test how well you judge what you see: which angle, and how far
along. Snow Pile, Sleigh Run and Lion Drum were removed after play-testing (ADR-044).
They're inspired
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
   the same task on the TV and answers on the captain's phone. Points per round: up to
   50 (a round's share of 150) times the team's own closeness, whatever the other teams
   did; no answer scores 0 (ADR-045).
4. Answers stay secret until the reveal (S24-AC7); the TV shows who has answered.
   Anything that gives the answer away shows only while it's meant to be seen. A TV or
   phone holding a view from before the start shows Get ready until the next one comes,
   which it fetches the moment the round starts.

### Staff Angle (`staffangle`)

1. The screen says an angle ("Set the staff at 35°"). The player turns a wushu staff on
   their phone by dragging it round. There are no buttons to step it, so the angle can't
   be counted out (Khai, 2026-11-24), and no number on screen to read off while
   turning, only a flat floor line to judge from. Solo locks it in; a showdown phone
   sends where the staff is as the time runs out.
2. Levels: multiples of 15° (15 to 165), then multiples of 5°, then any whole degree.
   15 s to answer.
3. Closeness: 1 minus the miss in degrees over 45, never below 0 (5° off is 0.89).

### Cut the Ribbon (`ribbon`)

1. A ribbon stretches across the screen with no marks on it. The screen says a fraction
   ("Cut it one third of the way along"). The player taps where to cut and can move it.
   Solo locks it in; a showdown phone sends the cut as the time runs out.
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
- **Captain phone (showdown):** the same input as solo, with no Lock in: what's on it goes in as the time runs out.
- **Demo:** each game's looping TV demo and one line of text (spec 24).

## Acceptance criteria

- [x] AC-1: Each game deals tasks from a seed at levels 1 to 3 that get harder, and scores answers by closeness from 0 to 1 by its own rule.
- [x] AC-2: Solo runs three tasks, levels 1 to 3, with a show phase and an answer window each, scores the game's points times the average closeness, and counts no answer as 0.
- [x] AC-3: Showdowns run three rounds, levels 1 to 3, every team answering the same task, and score each team up to 50 a round on its own closeness, no answer 0.
- [x] AC-4: Nothing that gives an answer away reaches a phone or the TV outside its show time, and answers stay secret until the reveal.
- Retired with Lion Drum (ADR-044): AC-5, phone-timed taps.
- [x] AC-6: The event file can run any perception game solo or as a showdown, and both appear in the game library.

## Tests

- Unit: each game's dealing by level and its closeness rule; the solo and showdown adapters.
- Play tests: the showdown versions on spec 24's harness, 1 to 6 teams, perfect, random, late, silent and dropped-out teams.
- Component: each game's input on the phone, solo and showdown, and the TV views.
- Smoke: every game at every moment on the TV and phones through the dev gallery.

## Out of scope

- Other modes for the existing games: only where they play better (ADR-041, backlog).
