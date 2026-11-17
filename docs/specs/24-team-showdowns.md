# 24: Team showdowns (Fly-by Count, Memory Path, Blind Stop)

**Status:** Ready
**Backlog:** M3
**Depends on:** 03, 11

## Summary

Team games played on the big screen, with each team's captain's phone as the controller (Khai, 2026-11-17). The solo games train players for them: a showdown is like a solo game, but not exactly the same, so a team has to choose who is best for it. Each round, a team sends one player, and nobody goes again until everyone on their team has had a turn. The host runs the pace from Controls. Before each game the TV plays a short animated demo of how it works, not just text. Three games to start:

- **Fly-by Count:** a grid of presents flies across the TV; teams count them. Like Mario Party's "Goomba Spotting". Trained by Rapid Recall.
- **Memory Path:** a long winding path lights up across a grid and then hides; teams take turns crossing it from memory, and a wrong or slow step knocks them out. Like MrBeast's memorize-the-path challenge. Trained by Pathfinder.
- **Blind Stop:** a clock starts on the TV, turns into a "?" after 3 seconds, and every team tries to stop it at exactly 10.00. Trained by T-Timer.

## User stories

- As a captain, I want to pick who plays each round on my phone, so our best person for each game can go.
- As a team, we want everyone to get a turn, so the same person doesn't play every game.
- As a player up for my team, I want the TV to show the game and the captain's phone to be my controller.
- As the host, I want to step through rounds with Next, so I can hype the room and show results.
- As anyone in the room, I want a quick animated demo of each game on the TV before it starts.

## Behavior

### Showdowns in general

1. A showdown is a team game (`phase: "team"`, `mode: "live"`) of type `flyby`, `path` or `blindstop`, run as a live session (spec 11). One runs at a time. Only captains' phones control it (ADR-014). Other players' phones show "Watch the TV" and their team's status.
2. **Steps, driven by the host's Next in Controls:** intro (the animated demo) → who's up → play → results → (next round: who's up again) → final standings → end. Controls shows which step is live and what Next will do. The host can also end a showdown early; points already given stay.
3. **Who's up.** At the start of each round, each captain's phone lists their team. The captain taps who's playing, and that person takes the captain's phone. Rotation: a player can't be picked again until everyone on their team has had a turn; the app greys them out. When everyone has gone, the rotation starts over. Rotation counts across every showdown in the event, so it spreads turns across the night, not just one game. A team of one is always its captain. The TV shows each team's player for the round. If a captain hasn't picked when the host taps Next, the app picks the next teammate in rotation.
4. **Points** go to the team through the ledger (ADR-006, ADR-030), each game by its own rule (below). Results show each team's answer or progress and the points.
5. **A captain's phone that drops out** mid-round counts as no answer for that round (Fly-by: 0; Blind Stop: last place; Memory Path: out when its turn comes). Reloading rejoins at the current step.

### Animated how-to-play (TV)

6. Each showdown type has a short looping demo (about 5 seconds), drawn in the event's style: a mini version of the game with a hand or cursor showing the moves, and one line of text under it. It plays on the TV during the intro step. Phones show the same line and "Watch the TV". Reduced motion: a still frame with the line.

### Fly-by Count (`flyby`)

7. Content: `rounds`, each with a count range, how long the fly-by lasts and the grid size; defaults are 3 rounds that get harder (6 to 12 presents over 4 s, 10 to 18 over 3.5 s, 15 to 25 over 3 s). The layout comes from the session's seed; the count is never sent to phones before the reveal.
8. Play: the presents fly across the TV in rows and columns with gaps (some rows offset). When they've passed, every team's player types a number on the captain's phone and taps Lock in, within 10 seconds.
9. Results: the TV replays the fly-by slowly, counting up, then shows each team's number. **Points per round: exactly right 100, one off 50, otherwise 0.**

### Memory Path (`path`)

10. Content: grid size (default 5 wide × 9 tall), path length (default 12 to 16 steps), how long the path shows (default 6 s), seconds per step (default 5), and the finisher's points (default 150). The path comes from the seed: it starts on the bottom row, moves one square up, left or right at a time, never back on itself, and ends on the top row.
11. Show: the path lights up square by square on the TV, then hides. Teams cross in a random order, shown on the TV.
12. A team's turn: the phone shows the grid; the player taps the next square, starting on the bottom row. Each step must be tapped within the step time. **A wrong square, or running out of time, knocks the team out**; the TV marks how far they got. The squares a team got right stay lit for the teams after them, so each try makes it easier for the next.
13. **Points: only the team that makes it across scores** (150). If every team is knocked out, nobody scores, and the TV shows the whole path.

### Blind Stop (`blindstop`)

14. Content: target (default 10.00 s), seconds the clock shows before turning into "?" (default 3). Several rounds (default 1; the host can run it again).
15. Play: the TV shows a big clock counting up from 0.00. After 3 s the numbers become a "?" while it keeps running. Every team's player taps Stop on the captain's phone. Each phone times from when it got the start, to the hundredth (network lag would swamp a server-side time; same idea as T-Timer, spec 16). A phone that hasn't stopped by 20 s counts as no answer.
16. Results: the TV reveals every team's time, closest first. **Points: ranked by how close to 10.00: 100, 70, 50, 30, then 10 for every team after; an exact 10.00 gets a 50 bonus.** Ties share the place.

## Data

- Showdown game content in the event file, validated per type like solo games.
- Live session state in Realtime Database under the session (spec 11): step, round, seed, each team's player, answers, progress, and for Memory Path the turn order and who's out. Answers that score are checked and awarded by the server.
- Rotation: `live/{slug}/rotation/{teamId}`: the player ids who've had a turn since it last started over. Kept for the whole event.
- Awards: ledger entries per team per round, with the showdown and round in the award id so a retry can't pay twice.

## Routes and real-time

- Controls: start a showdown, Next, end early (admin routes from spec 11).
- Captain phone: pick who's up; send an answer (Fly-by number, Memory Path tap, Blind Stop time). Route handlers check it's that team's captain, the step and the round.
- TV and phones follow the session in real time (spec 11).

## UI

- **TV:** the main show. The demo, who's up for each team, the game itself, results with points, and final standings. Read from across the room.
- **Captain phone:** the controller. Who's up list (greyed-out players already used), then a big single-purpose control: a number pad (Fly-by), the path grid (Memory Path) or one huge Stop button (Blind Stop). Locked and waiting states are clear.
- **Other phones:** "Watch the TV", their team's player this round, and their team's points.
- **Controls:** the current step, the Next button with what it'll do, End early, and each team's status.

## Edge cases

- A team with no captain online: it sits the round out; its rotation doesn't move.
- The host taps Next before everyone answers: unanswered teams count as no answer.
- A captain changes their pick before Next: allowed until the play step starts.
- Two showdowns can't run at once; starting one while another runs is refused.
- Reload of the TV or Controls mid-round picks up the current step.

## Acceptance criteria

- [ ] AC-1: A showdown steps intro → who's up → play → results per round, then final standings, only on the host's Next, and can be ended early with points kept.
- [ ] AC-2: The captain picks who's up from their team; someone who's had a turn is greyed out until everyone on the team has gone, counting across all showdowns in the event; an unpicked team gets the next teammate in rotation on Next.
- [ ] AC-3: Only a team's captain can pick and answer for it; other phones show Watch the TV and their team's status.
- [ ] AC-4: Each showdown's TV intro plays a looping animated demo with one line of text (a still frame under reduced motion).
- [ ] AC-5: Fly-by Count deals rounds from the seed, never sends the count early, takes one locked-in number per team within 10 s, and scores exact 100, one off 50, else 0.
- [ ] AC-6: Memory Path deals a path from the seed (bottom to top, up/left/right, never doubling back), hides it after showing it, gives teams turns in a random order, knocks a team out on a wrong square or a slow step, keeps their right squares lit for the next teams, and pays 150 only to the team that crosses.
- [ ] AC-7: Blind Stop shows the clock for 3 s then a "?", takes each team's phone-timed stop, and ranks by closeness to 10.00: 100, 70, 50, 30, then 10, with a 50 bonus for exactly 10.00 and ties sharing.
- [ ] AC-8: All showdown points go to teams through the ledger, once per team per round.

## Tests

- Unit: the step machine and rotation (AC-1, AC-2); each game's dealing and scoring from a seed (AC-5 to AC-7); award ids (AC-8).
- Component: captain who's-up list with greyed players; each controller; Watch the TV for others (AC-2, AC-3).
- E2E: a showdown with two teams on two captain phones, the TV and Controls, through each game type (AC-1 to AC-7).

## Out of scope

- Animated instructions for the solo games (a later spec).
- Teams playing a showdown without captains' phones.
- More showdown types; see `docs/reference/game-ideas.md`.

## Open questions

None open. Answered 2026-11-17: A36–A40 in `OPEN_QUESTIONS.md`.
