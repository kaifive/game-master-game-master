# 24: Team showdowns (the framework)

**Status:** Done (blind-reviewed 2026-11-18: `docs/reviews/showdowns.md`)
**Backlog:** M3
**Depends on:** 03, 11. The games themselves are specs 25 (count and stop), 26 (nerve) and 27 (turns).

## Summary

Team games played on the big screen, with each team's captain's phone as the controller (Khai, 2026-11-17). The solo games train players for them: a showdown is like a solo game, but not exactly the same, so a team has to choose who is best for it. Each round, a team sends one player up to play on the captain's phone, and nobody goes again until everyone on their team has had a turn; the host keeps track in Controls, since not everyone has a phone (Khai, 2026-11-17). The host runs the pace from Controls, and the showdown is its own TV screen, swapped to like the leaderboard. Anywhere from 1 to 6 teams can play, the most an event can have (Khai, 2026-11-18); most parties will have 4 or 5. Before each game the TV plays a short animated demo of how it works, not just text. Twelve games:

- **Fly-by Count:** a grid of presents flies across the TV; teams count them, and in later rounds count only the kind it names at the end. Like Mario Party's "Goomba Spotting". Trained by Rapid Recall.
- **Memory Path:** a long winding path lights up across a grid and then hides; teams take turns crossing it from memory, and a wrong or slow step knocks them out. Like MrBeast's memorize-the-path challenge. Trained by Pathfinder.
- **Blind Stop:** a clock starts on the TV, turns into a "?" after 3 seconds, and every team tries to stop it at exactly 10.00. Trained by T-Timer.
- **Present Shuffle:** presents show their points, then cover up and shuffle; teams take turns picking, so the big one you tracked may go first. Like a shell game. Trained by Rapid Recall.
- **Auction:** a prize goes up each round and every team secretly bids a number from 1 to 10, each number once per game; the highest bid that nobody tied wins. Like the card game Raj. Pure strategy.
- **Snowball to 21:** a shared count goes up by 1, 2 or 3 a turn; whoever lands on exactly 21 wins. A classic strategy game you can work out.
- **Stocking Stuffer:** every round, open another stocking for points or bank what you have; coal loses the round's haul. Push your luck.
- **Snow Sum:** snowflakes with +3, −2 or ×2 fall on the TV; keep a running total in your head. Trained by Rapid Recall.
- **Share or Snatch:** two teams, one pot: each secretly picks Share or Snatch. Both share, they split it; one snatches, they take it all; both snatch, nobody gets it. Pure nerve and trust.
- **Last Second:** a countdown runs on the TV; stop it as late as you dare. The last team to stop before zero wins; hit zero and you get nothing. Trained by T-Timer.

## User stories

- As a team, we want everyone to get a turn, so the same person doesn't play every game, even people without a phone.
- As the host, I want to see at a glance who on each team has played and who hasn't, and add people who never joined on a phone.
- As the host, I want to switch the TV between the leaderboard and the showdown.
- As anyone in the room, I want to watch the team leaderboard update at the end of a showdown: points rolling in and teams overtaking each other.
- As a player up for my team, I want the TV to show the game and the captain's phone to be my controller.
- As the host, I want to step through rounds with Next, so I can hype the room and show results.
- As anyone in the room, I want a quick animated demo of each game on the TV before it starts.

## Behavior

### Showdowns in general

1. A showdown is a team game (`phase: "team"`, `mode: "live"`) of type `flyby`, `path`, `blindstop`, `shuffle`, `auction`, `to21`, `stockings`, `snowsum`, `snatch`, `lastsecond`, `buzzer` or a perception game (spec 28), run as a live session (spec 11). One runs at a time. Only captains' phones control it (ADR-014). Other players' phones show "Watch the TV" and their team's status. When an answer timer runs out, a captain's phone sends whatever is on it (a typed number, a turned staff, a picked bid); a phone with nothing on it sends nothing (Khai, 2026-11-24).
2. **Steps, driven by the host's Next in Controls:** intro (the animated demo) → play → results → (next round: play again) → final standings → end. Between rounds the room sends up its next players while results show; Next starts the round on a shared countdown (3 s). A round shows its results by itself as soon as it has nothing left to wait for: every team has answered or finished its turn, or the time is up and a second has passed for answers sent at the last moment (Khai, 2026-11-24); the host can still press Show results sooner. Screens fetch again at each start, end of show and close, so nothing waits on the next poll. Controls shows which step is live and what Next will do. The host can also end a showdown early; points already given stay.
3. **Who's played (host tracker).** Not everyone on a team has a phone, so the app doesn't pick players (Khai, 2026-11-17). Controls has a Who's played list for every team: the team's joined players, plus people the host adds by name (and can remove). Tapping a name marks them played, in their team's color; tapping again unmarks them. Each team shows how many have played, and once everyone has, a Start over button clears that team. The list is kept for the whole event, across every showdown, and works whether or not a showdown is running. The player who's up plays on the captain's phone.
3a. **The Showdown screen.** The TV has two screens, the leaderboard and the showdown; the host switches between them in Controls at any time. Starting a showdown switches the TV to it. With no showdown running, the Showdown screen shows the **menu of showdowns**: a card for each live game in the event that isn't off (hidden ones too), with its name only (no subtitle), the ones already played tonight marked Played and set back, and the team standings, small, beside it (Khai, 2026-11-24). A showdown counts as played once it has shown a round's results; a played one can still be started again.
3b. **Controls on the TV.** If the TV's browser is signed in as the host (the same passphrase as Controls), the TV is a control surface too: tapping a game on the menu starts it, and a small bar in a corner has Next (named as in Controls), End early, and the switch between the leaderboard and the showdowns. Controls keeps every control, so the host can run from either (Khai, 2026-11-24). A TV that isn't signed in shows the screens only.
3b. **1 to 6 teams.** Every showdown works for any number of teams from 1 to 6, the most an event can have (spec 03), and lays out for 6 on the TV. A game that needs more teams says so (Share or Snatch needs 2) and Controls won't start it.
3c. **The standings update.** On the final step, the TV shows the team leaderboard as it was before the showdown, then rolls each team's showdown points onto its total ("+150") and slides teams into their new places, marking who moved up. Under reduced motion it shows the new standings straight away.
4. **Points** go to the team through the ledger (ADR-006, ADR-030), each game by its own rule (specs 25 to 28). Every showdown is worth up to 150 a game, split evenly over its rounds (50 a round over three), and a team scores on how well it did itself, never by its rank against the other teams; points never go below zero (ADR-045, Khai 2026-11-24). The buzzer round (spec 12) keeps its own points per question. Results show each team's answer or progress and the points.
4a. **No Lock in on a showdown phone** (Khai, 2026-11-24). Whatever is on the captain's phone (a typed number, the staff, the cut) goes in as the timer runs out, a moment before it ends so it reaches the server in time. Games where the choice is the move (a bid, Share or Snatch, a pick, a stop) send it on the tap, as before.
5. **A captain's phone that drops out** mid-round counts as no answer for that round (Fly-by: 0; Blind Stop: last place; Memory Path: out when its turn comes). Reloading rejoins at the current step. A team without a captain sits the showdown out.

### Animated how-to-play (TV)

6. Each showdown type has a short looping demo (about 5 seconds), drawn in the event's style: a mini version of the game on a drawn TV, with the room in front of it (a few drawn people, one calling out what a team would answer, such as "7!"), so it's clear what's on the screen and what players do (Khai, 2026-11-24), and one line of text under it. The game's name sits centered above it. It plays on the TV during the intro step. Phones show the same line and "Watch the TV". Reduced motion: a still frame with the line.

### Fair for every team (Khai, 2026-11-17)

6a. **Going first is shared.** In any game where going or picking first helps, who leads rotates so every team leads equally often, and the game runs whole rotations so nobody leads one more time than another: Memory Path and Present Shuffle play one round per team, each team leading one round; Snowball to 21 plays one round per team, each team starting one. Share or Snatch gives every team the same number of matchups: with an odd number of teams it plays one round per team, so each sits out exactly once.
6b. **Starts are shared clock times.** The server sets when a round starts (a moment a couple of seconds ahead), and every device times against the server's clock (spec 11), so no phone or the TV gets a head start from a faster network. Blind Stop and Last Second time each stop from that shared start.
6c. **Secret answers stay secret.** In games where teams answer at once, no team's phone or the TV sees another team's answer until the reveal, and nothing that gives the answer away (a count, the next stocking, a path) reaches a phone before it's needed.
6d. **Same time for everyone.** Answer windows are the same length for every team and are checked on the server's clock.

### Play-tested and blind-reviewed

6e. **Mock play tests.** Every showdown has a scripted play-test suite that runs whole games with bot teams in many scenarios: 1, 2, 3, 4, 5 and 6 teams; perfect, random, cautious and reckless players; teams that never answer, answer late, or drop out mid-game; and ties. Each run checks the game always ends, every score is within the game's limits and paid once, secrets never leak to phones, and leading is shared (6a).
6f. **Blind review.** Before a showdown ships, reviewers who see only what players see (the demo line, the instructions, the TV and phone screens and their words), never the spec or code, play it through in their heads and say what they'd find confusing or unfair. Their findings and the fixes are written up in `docs/reviews/showdowns.md`.

## Data

- Showdown game content in the event file, validated per type like solo games.
- Live session state in Realtime Database under the session (spec 11): step, round, seed, each team's player, answers, progress, and for Memory Path the turn order and who's out. Answers that score are checked and awarded by the server.
- Who's played: stored with the session at `live/{slug}` (spec 11): per team, the people the host added by name and the ids of everyone marked played. Kept for the whole event.
- The TV screen (`leaderboard` or `showdown`), stored there too.
- Awards: ledger entries per team per round, with the showdown and round in the award id so a retry can't pay twice.

## Routes and real-time

- Controls: switch the TV screen, start a showdown, Next, end early, and mark, add, remove and start over in Who's played (admin routes from spec 11).
- Captain phone: send an answer (Fly-by number, Memory Path tap, Blind Stop time). Route handlers check it's that team's captain, the step and the round.
- TV and phones follow the session in real time (spec 11).

## UI

- **TV:** the main show, on the Showdown screen. The demo, the game itself, results with points, and the animated standings update. Read from across the room, with up to 6 teams.
- **Captain phone:** the controller: a big single-purpose control: a number pad (Fly-by), the path grid (Memory Path) or one huge Stop button (Blind Stop). Locked and waiting states are clear.
- **Other phones:** "Watch the TV" and their team's points.
- **Controls:** the TV screen switch (Leaderboard or Showdown), the current step, the Next button with what it'll do, End early, each team's points, and Who's played.

## Edge cases

- A team with no captain online: it sits the round out.
- Someone added by name joins on a phone later: the host removes the added name; both show until then.
- The host taps Next before everyone answers: unanswered teams count as no answer.
- Two showdowns can't run at once; starting one while another runs is refused.
- Reload of the TV or Controls mid-round picks up the current step.

## Acceptance criteria

- [x] AC-1: A showdown steps intro → play → results per round, then final standings, on the host's Next, except that a round shows its results (and pays them, once) by itself as soon as it has nothing left to wait for; it can be ended early with points kept.
- [x] AC-2: Controls' Who's played lists each team's joined players plus people the host adds by name, marks who has played in the team's color when tapped (tap again to unmark), counts them, offers Start over once everyone has played, and keeps it across every showdown in the event.
- [x] AC-3: Only a team's captain can pick and answer for it; other phones show Watch the TV and their team's status.
- [x] AC-4: Each showdown's TV intro plays a looping animated demo on a drawn TV with the room calling out an answer, and one line of text (a still frame under reduced motion).
- [x] AC-5: All showdown points go to teams through the ledger, once per team per round.
- [x] AC-6: Every game where going or picking first helps rotates who leads so each team leads equally often over a whole game (Memory Path, Present Shuffle, Snowball to 21), and Share or Snatch gives every team the same number of matchups.
- [x] AC-7: Round starts are server times, and every device and the server time stops and answer windows against the server clock; secret answers and anything that gives an answer away never reach a phone or the TV before the reveal.
- [x] AC-8: Every showdown has a mock play-test suite (1, 2, 3, 4, 5 and 6 teams; perfect, random, cautious, reckless, silent, late and dropped-out teams; ties) in which every game ends, scores stay within limits and are paid once, nothing secret leaks, and leading is shared.
- [x] AC-9: The showdown is a TV screen the host switches to and from like the leaderboard; starting a showdown switches to it, and with none running it shows the menu of showdowns, the played ones marked, and the team standings. A TV signed in as the host can start a showdown from the menu and step it from its own buttons.
- [x] AC-10: On the final step the TV shows the team standings before the showdown, then rolls the showdown's points onto each total and moves teams to their new places, marking rank changes; under reduced motion it shows the result at once.
- [x] AC-11: A showdown runs with any number of teams from 1 to 6; a game that needs more teams than are playing can't be started, and Controls says why.

## Tests

- Unit: the step machine and Who's played (AC-1, AC-2), the screen switch (AC-9), minimum teams (AC-11), the ledger award ids (AC-5), the turn-order rotation helper (AC-6), and the shared clock and answer windows (AC-7).
- Component: Who's played in Controls (AC-2); Watch the TV for other phones (AC-3); the demo frame, with a still under reduced motion (AC-4); the screen switch on the TV (AC-9); the standings update, moving and still (AC-10).
- Play tests (AC-8): the shared bot harness in `lib/live/playtest.ts`, run by each game's `playtest.test.ts` (specs 25 to 27), with a stand-in game here.
- E2E: Fly-by Count (spec 25), two teams on two captain phones, the TV and Controls (AC-1 to AC-3, AC-9), in `e2e/showdowns.spec.ts`.
- Blind review (6f): `docs/reviews/showdowns.md`.

## Out of scope

- Animated instructions for the solo games (a later spec).
- Teams playing a showdown without captains' phones.
- More showdown types; see `docs/reference/game-ideas.md`.

## Open questions

None open. Answered 2026-11-17: A36–A48 in `OPEN_QUESTIONS.md`.
