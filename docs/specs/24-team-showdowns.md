# 24: Team showdowns (the framework)

**Status:** Draft (agreed with Khai 2026-11-17: "let's build"; marked Ready in the PR that builds it, since check:ac makes Ready mean its tests exist)
**Backlog:** M3
**Depends on:** 03, 11. The games themselves are specs 25 (count and stop), 26 (nerve) and 27 (turns).

## Summary

Team games played on the big screen, with each team's captain's phone as the controller (Khai, 2026-11-17). The solo games train players for them: a showdown is like a solo game, but not exactly the same, so a team has to choose who is best for it. Each round, a team sends one player, and nobody goes again until everyone on their team has had a turn. The host runs the pace from Controls. Before each game the TV plays a short animated demo of how it works, not just text. Twelve games:

- **Fly-by Count:** a grid of presents flies across the TV; teams count them. Like Mario Party's "Goomba Spotting". Trained by Rapid Recall.
- **Memory Path:** a long winding path lights up across a grid and then hides; teams take turns crossing it from memory, and a wrong or slow step knocks them out. Like MrBeast's memorize-the-path challenge. Trained by Pathfinder.
- **Blind Stop:** a clock starts on the TV, turns into a "?" after 3 seconds, and every team tries to stop it at exactly 10.00. Trained by T-Timer.
- **Land Mass:** teams take turns dragging block pieces from a shared tray onto one board, claiming squares in their color; the most land wins. Like a mix of Tetris pieces and Blokus territory, with drafting: take the piece another team wanted. Trained by Block Fit.
- **Present Shuffle:** presents show their points, then cover up and shuffle; teams take turns picking, so the big one you tracked may go first. Like a shell game. Trained by Rapid Recall.
- **Auction:** a prize goes up each round and every team secretly bids a number from 1 to 10, each number once per game; the highest bid that nobody tied wins. Like the card game Raj. Pure strategy.
- **Snowball to 21:** a shared count goes up by 1, 2 or 3 a turn; whoever lands on exactly 21 wins. A classic strategy game you can work out.
- **Stocking Stuffer:** every round, open another stocking for points or bank what you have; coal loses the round's haul. Push your luck.
- **Snow Sum:** snowflakes with +3, −2 or ×2 fall on the TV; keep a running total in your head. Trained by Rapid Recall.
- **Share or Snatch:** two teams, one pot: each secretly picks Share or Snatch. Both share, they split it; one snatches, they take it all; both snatch, nobody gets it. Pure nerve and trust.
- **Last Second:** a countdown runs on the TV; stop it as late as you dare. The last team to stop before zero wins; hit zero and you get nothing. Trained by T-Timer.
- **Color Count:** ornaments of different colors flash on the TV; only at the end does it ask how many of one color there were, so teams don't know which to count. Trained by Rapid Recall.

## User stories

- As a captain, I want to pick who plays each round on my phone, so our best person for each game can go.
- As a team, we want everyone to get a turn, so the same person doesn't play every game.
- As a player up for my team, I want the TV to show the game and the captain's phone to be my controller.
- As the host, I want to step through rounds with Next, so I can hype the room and show results.
- As anyone in the room, I want a quick animated demo of each game on the TV before it starts.

## Behavior

### Showdowns in general

1. A showdown is a team game (`phase: "team"`, `mode: "live"`) of type `flyby`, `path`, `blindstop`, `landmass`, `shuffle`, `auction`, `to21`, `stockings`, `snowsum`, `snatch`, `lastsecond` or `colorcount`, run as a live session (spec 11). One runs at a time. Only captains' phones control it (ADR-014). Other players' phones show "Watch the TV" and their team's status.
2. **Steps, driven by the host's Next in Controls:** intro (the animated demo) → who's up → play → results → (next round: who's up again) → final standings → end. Controls shows which step is live and what Next will do. The host can also end a showdown early; points already given stay.
3. **Who's up.** At the start of each round, each captain's phone lists their team. The captain taps who's playing, and that person takes the captain's phone. Rotation: a player can't be picked again until everyone on their team has had a turn; the app greys them out. When everyone has gone, the rotation starts over. Rotation counts across every showdown in the event, so it spreads turns across the night, not just one game. A team of one is always its captain. The TV shows each team's player for the round. If a captain hasn't picked when the host taps Next, the app picks the next teammate in rotation.
4. **Points** go to the team through the ledger (ADR-006, ADR-030), each game by its own rule (below). Results show each team's answer or progress and the points.
5. **A captain's phone that drops out** mid-round counts as no answer for that round (Fly-by: 0; Blind Stop: last place; Memory Path: out when its turn comes). Reloading rejoins at the current step.

### Animated how-to-play (TV)

6. Each showdown type has a short looping demo (about 5 seconds), drawn in the event's style: a mini version of the game with a hand or cursor showing the moves, and one line of text under it. It plays on the TV during the intro step. Phones show the same line and "Watch the TV". Reduced motion: a still frame with the line.

### Fair for every team (Khai, 2026-11-17)

6a. **Going first is shared.** In any game where going or picking first helps, who leads rotates so every team leads equally often, and the game runs whole rotations so nobody leads one more time than another: Memory Path and Present Shuffle play one round per team, each team leading one round; Snowball to 21 plays one round per team, each team starting one; Land Mass rotates who leads each time round the table. Share or Snatch gives every team the same number of matchups: with an odd number of teams it plays one round per team, so each sits out exactly once.
6b. **Starts are shared clock times.** The server sets when a round starts (a moment a couple of seconds ahead), and every device times against the server's clock (spec 11), so no phone or the TV gets a head start from a faster network. Blind Stop and Last Second time each stop from that shared start.
6c. **Secret answers stay secret.** In games where teams answer at once, no team's phone or the TV sees another team's answer until the reveal, and nothing that gives the answer away (a count, the next stocking, a path) reaches a phone before it's needed.
6d. **Same time for everyone.** Answer windows are the same length for every team and are checked on the server's clock.

### Play-tested and blind-reviewed

6e. **Mock play tests.** Every showdown has a scripted play-test suite that runs whole games with bot teams in many scenarios: 2, 3, 5 and 8 teams; perfect, random, cautious and reckless players; teams that never answer, answer late, or drop out mid-game; and ties. Each run checks the game always ends, every score is within the game's limits and paid once, secrets never leak to phones, and leading is shared (6a).
6f. **Blind review.** Before a showdown ships, reviewers who see only what players see (the demo line, the instructions, the TV and phone screens and their words), never the spec or code, play it through in their heads and say what they'd find confusing or unfair. Their findings and the fixes are written up in `docs/reviews/showdowns.md`.

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
- [ ] AC-5: All showdown points go to teams through the ledger, once per team per round.
- [ ] AC-6: Every game where going or picking first helps rotates who leads so each team leads equally often over a whole game (Memory Path, Present Shuffle, Snowball to 21, Land Mass), and Share or Snatch gives every team the same number of matchups.
- [ ] AC-7: Round starts are server times, and every device and the server time stops and answer windows against the server clock; secret answers and anything that gives an answer away never reach a phone or the TV before the reveal.
- [ ] AC-8: Every showdown has a mock play-test suite (2, 3, 5 and 8 teams; perfect, random, cautious, reckless, silent, late and dropped-out teams; ties) in which every game ends, scores stay within limits and are paid once, nothing secret leaks, and leading is shared.

## Tests

- Unit: the step machine, who's up and rotation (AC-1, AC-2), the ledger award ids (AC-5), the turn-order rotation helper (AC-6), and the shared clock and answer windows (AC-7).
- Component: the captain's who's-up list with greyed-out players; Watch the TV for other phones (AC-2, AC-3); the demo frame, with a still under reduced motion (AC-4).
- Play tests (AC-8): the shared bot harness in `lib/live/playtest.ts`, run by each game's `playtest.test.ts` (specs 25 to 27), with a stand-in game here.
- E2E: a showdown with a stand-in game, two teams on two captain phones, the TV and Controls (AC-1 to AC-3).
- Blind review (6f): `docs/reviews/showdowns.md`.

## Out of scope

- Animated instructions for the solo games (a later spec).
- Teams playing a showdown without captains' phones.
- More showdown types; see `docs/reference/game-ideas.md`.

## Open questions

None open. Answered 2026-11-17: A36–A48 in `OPEN_QUESTIONS.md`.
