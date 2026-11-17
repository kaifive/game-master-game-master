# 24: Team showdowns

**Status:** Ready
**Backlog:** M3
**Depends on:** 03, 11

## Summary

Team games played on the big screen, with each team's captain's phone as the controller (Khai, 2026-11-17). The solo games train players for them: a showdown is like a solo game, but not exactly the same, so a team has to choose who is best for it. Each round, a team sends one player, and nobody goes again until everyone on their team has had a turn. The host runs the pace from Controls. Before each game the TV plays a short animated demo of how it works, not just text. Nine games:

- **Fly-by Count:** a grid of presents flies across the TV; teams count them. Like Mario Party's "Goomba Spotting". Trained by Rapid Recall.
- **Memory Path:** a long winding path lights up across a grid and then hides; teams take turns crossing it from memory, and a wrong or slow step knocks them out. Like MrBeast's memorize-the-path challenge. Trained by Pathfinder.
- **Blind Stop:** a clock starts on the TV, turns into a "?" after 3 seconds, and every team tries to stop it at exactly 10.00. Trained by T-Timer.
- **Land Mass:** teams take turns dragging block pieces from a shared tray onto one board, claiming squares in their color; the most land wins. Like a mix of Tetris pieces and Blokus territory, with drafting: take the piece another team wanted. Trained by Block Fit.
- **Present Shuffle:** presents show their points, then cover up and shuffle; teams take turns picking, so the big one you tracked may go first. Like a shell game. Trained by Rapid Recall.
- **Auction:** a prize goes up each round and every team secretly bids a number from 1 to 10, each number once per game; the highest bid that nobody tied wins. Like the card game Raj. Pure strategy.
- **Snowball to 21:** a shared count goes up by 1, 2 or 3 a turn; whoever lands on exactly 21 wins. A classic strategy game you can work out.
- **Stocking Stuffer:** every round, open another stocking for points or bank what you have; coal loses the round's haul. Push your luck.
- **Snow Sum:** snowflakes with +3, −2 or ×2 fall on the TV; keep a running total in your head. Trained by Rapid Recall.

## User stories

- As a captain, I want to pick who plays each round on my phone, so our best person for each game can go.
- As a team, we want everyone to get a turn, so the same person doesn't play every game.
- As a player up for my team, I want the TV to show the game and the captain's phone to be my controller.
- As the host, I want to step through rounds with Next, so I can hype the room and show results.
- As anyone in the room, I want a quick animated demo of each game on the TV before it starts.

## Behavior

### Showdowns in general

1. A showdown is a team game (`phase: "team"`, `mode: "live"`) of type `flyby`, `path`, `blindstop`, `landmass`, `shuffle`, `auction`, `to21`, `stockings` or `snowsum`, run as a live session (spec 11). One runs at a time. Only captains' phones control it (ADR-014). Other players' phones show "Watch the TV" and their team's status.
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

### Land Mass (`landmass`)

17. Content: board size (default 12 wide × 10 tall), tray size (default 4), seconds per turn (default 20). Pieces are 3 to 5 squares, like Block Fit's, dealt from the seed.
18. One shared board and one shared tray, seen by every team on the TV. Teams take turns in a random order, shown on the TV, round and round.
19. A turn: the next teammate in the team's rotation is up (the TV shows their name; the captain can swap who before they place), and plays on the captain's phone. They pick a piece from the tray, tap to turn it, and drag it onto the board. **It can go anywhere it fits**: inside the board and on empty squares only (Khai, 2026-11-17). Placed, it takes the team's color. A new piece comes into the tray in its place. Out of time: the turn passes with nothing placed.
20. Turns pass on their own inside the game; the host's Next starts it and shows the results.
21. **End:** when no piece in the tray fits anywhere on the board, the tray is swapped for a fresh one once; if still nothing fits, the game ends. A team whose turn comes while nothing fits is skipped the same way.
22. Results: the TV shows the board with each team's squares counted. **Points: ranked by squares held: 150, 100, 70, 50, 30, then 10 for every team after.** Ties share the place.

### Turn-based showdowns

23. In the turn-based showdowns (Land Mass, Present Shuffle, Snowball to 21), each turn is played by the next teammate in the team's rotation, like Land Mass (19), and turns pass on their own inside the game. In the others, one player plays each round (3).

### Present Shuffle (`shuffle`)

24. Content: number of presents (default 9, in a 3 × 3 grid), point values (default 10 to 100, dealt from the seed), seconds shown (default 4), shuffle time (default 5 s, getting faster), seconds per pick (default 15).
25. Show: the presents appear with their points showing, then the lids close and they shuffle around the TV, where everyone can follow them.
26. Picking: teams take turns in a random order. On a team's turn the phone shows the presents where they now stand; the player taps one, and the TV opens it: those points go to the team, and the present is gone for everyone. Too slow: the turn passes.
27. Teams pick until each has had the same number of picks (as many as the presents allow); any left over open at the end for show. **Points: the sum of the presents a team picked.**

### Auction (`auction`)

28. Content: number of rounds (default 10), prize values (default 10 to 100, dealt from the seed), seconds to bid (default 15).
29. Each team has the numbers 1 to 10, and **each number can be used once per game** (Khai, 2026-11-17). The phone shows the ones left.
30. A round: the TV shows the prize. Every team secretly picks one of its numbers. Then the TV reveals the bids: **numbers that tie cancel each other out, and the highest bid that nobody tied wins the prize.** If every bid ties, nobody wins it. A team that doesn't bid in time spends its lowest number left.
31. **Points: the prizes a team won.** The TV keeps a running total and shows which numbers each team has left.

### Snowball to 21 (`to21`)

32. Three rounds. A shared snowball count starts at 0. Teams take turns in order, and a different team starts each round.
33. On its turn a team adds 1, 2 or 3 to the count (a choice that would go past 21 is off), within 10 s; too slow adds 1.
34. **The team that makes the count exactly 21 wins the round: 100 points.**

### Stocking Stuffer (`stockings`)

35. Content: number of rounds (default 5), stocking values (default 5 to 30), how often coal turns up (default 1 in 6), seconds to choose (default 10).
36. A round: every team still in taps **Open** or **Bank** at the same time. Each team that opens gets its own stocking from the seed, revealed on the TV: points go into that team's pot for the round, or **coal empties the pot and the team is out until the next round**. A team that banks keeps its pot and sits out the rest of the round. No choice in time counts as Bank.
37. The round ends when every team has banked or hit coal. **Points: everything a team banked.**

### Snow Sum (`snowsum`)

38. Content: rounds (default 3), each with how many snowflakes and which operations, getting harder (5 flakes of + and −, 7 flakes, then 8 flakes with ×2), dealt from the seed. Totals stay between −50 and 200.
39. Play: the snowflakes fall one at a time on the TV, starting from 0. When the last has fallen, every team types the total within 10 s and locks it in.
40. Results: the TV replays the sum step by step. **Points per round: exactly right 100, one off 50, otherwise 0.**

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
- [ ] AC-9: Land Mass shares one board and a tray of 4 seeded pieces with every team; teams take turns in a random order, each turn played by the next teammate in rotation; a piece goes anywhere it fits with no overlap, takes the team's color, and is replaced in the tray; a turn times out after 20 s; the tray swaps once when nothing fits and the game ends when still nothing fits; points are ranked by squares: 150, 100, 70, 50, 30, then 10, ties sharing.
- [ ] AC-10: Present Shuffle shows seeded values, covers and shuffles them on the TV, lets teams pick one at a time in a random order (each picked present gone for everyone, a slow pick passing), gives each team the same number of picks, and pays the sum of each team's presents.
- [ ] AC-11: Auction gives each team the numbers 1 to 10 once each, takes one secret bid a round (the lowest left if none), cancels tied bids, gives the prize to the highest untied bid (nobody if all tie), and pays the prizes won.
- [ ] AC-12: Snowball to 21 runs three rounds with a different team starting each, takes 1, 2 or 3 per turn (never past 21, 1 if too slow), and pays 100 to the team that makes exactly 21.
- [ ] AC-13: Stocking Stuffer takes Open or Bank from every team at once each round (Bank if no choice), reveals each opener's seeded stocking, empties a team's pot and puts it out for the round on coal, ends the round when all have banked or busted, and pays what each team banked.
- [ ] AC-14: Snow Sum deals harder seeded snowflake sums each round, takes one locked-in total per team within 10 s, and scores exact 100, one off 50, else 0.

## Tests

- Unit: the step machine and rotation (AC-1, AC-2); each game's dealing and scoring from a seed (AC-5 to AC-7, AC-9 to AC-14); Land Mass placement, refill, swap and end (AC-9); Auction ties and spent numbers (AC-11); Snowball to 21 limits (AC-12); Stocking Stuffer pots and coal (AC-13); award ids (AC-8).
- Component: captain who's-up list with greyed players; each controller; Watch the TV for others (AC-2, AC-3).
- E2E: a showdown with two teams on two captain phones, the TV and Controls, through each game type (AC-1 to AC-14).

## Out of scope

- Animated instructions for the solo games (a later spec).
- Teams playing a showdown without captains' phones.
- More showdown types; see `docs/reference/game-ideas.md`.

## Open questions

None open. Answered 2026-11-17: A36–A45 in `OPEN_QUESTIONS.md`.
