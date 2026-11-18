# Showdowns: blind review

Spec 24, behavior 6f: before showdowns ship, reviewers who see only what players
see play each game through in their heads and say what they'd find confusing or
unfair. This is what they found and what changed.

## How it was run (2026-11-18)

- **Packets:** for each of the 12 showdowns, screenshots of the TV (1920 × 1080) and a
  captain's phone (375 px) at each moment of a round: intro, the count before a
  round, the round itself, answering, and results. They were taken from the dev
  gallery (`/dev/ui/showdowns`) on the real game logic.
- **Context:** a one-page note on what a guest knows (teams, captains, the host taps
  Next), and a note per game saying what moves on screen between screenshots. No
  spec, rules sheet or code.
- **First pass:** four reviewers, three games each. Each played every game as a
  9-year-old, a grandparent who reads slowly, and a captain under time pressure.
- **Second pass:** a fresh reviewer looked at the eight games that changed most,
  after the fixes.

## Findings and fixes

### Every game

| Finding | Fix |
| --- | --- |
| The new, longer how-to-play lines ran off the bottom of the TV intro (second pass, blocker). | A smaller demo box and a wider, smaller caption; checked at 1080p. |
| Nothing says what happens if a team runs out of time. | Every showdown has an "Out of time?" line under its how-to-play, on the TV and the captain's phone (a test checks every game has one). |
| The captain's phone never says which team it is, so a phone that's been passed around can't be checked. | The phone's header names the team: "Snow Dragons · Round 1 of 3". |
| Timer bars have no seconds. | Every timer bar shows the seconds left beside it. |
| "Round 1 of 3" on the TV is small and grey. | Bigger, in full-strength ink. |
| "Showdown total" on a result card and the party's totals on the final standings look like two answers to the same question. | Cards say "This showdown: 100"; the final step is headed "Team standings for the whole party". |
| White empty space below the phone panel, and an "N" badge. | Artifacts of the review gallery and the dev server, not the party: the gallery's phone now fills dark, and the badge only exists in development. |

### Fly-by Count, Snow Sum, Color Count

| Finding | Fix |
| --- | --- |
| Snow Sum says "Add up" but also takes away and doubles; "×2" could read as "add 2". | "Start at 0 and do each snowflake in order: + adds, − takes away, ×2 doubles." |
| Snow Sum's step-by-step totals on the reveal are small and grey. | Bigger, in full ink. |
| Color Count never says how it scores, so a far-off answer scoring 50 looked like a bug. | "Closest team scores most." (It ranks by closeness, as agreed: A48.) |
| Color Count's question relies on color alone. | It names the pattern too: "How many red (striped) ornaments?" |
| Fly-by's intro didn't say you type the count afterwards. | "Count the presents as they fly past, then type how many." |
| Kept as is: the fly-by grid could be counted as rows times columns; loud teams have an edge. | The grid has random gaps and offset rows; shouting is part of the party. |

### Blind Stop, Last Second

| Finding | Fix |
| --- | --- |
| "Exactly! +50" sat above a 150 card. | "Exactly! 100 + 50 bonus." |
| "−0.38 off" reads like a minus score. | "0.38 early" / "0.48 late". |
| "Bust" isn't a word kids or grandparents know, and "latest stop wins" undersells second and third. | "Too late"; "Closest to zero scores most, but if it hits zero first you get nothing." |
| Which clock counts, the phone's or the TV's? | Last Second's phone says "Your tap counts, timed on this phone." (Both run on the shared server clock.) |
| A teammate could start a stopwatch at 0.00 (rated a blocker). | The intro now says "no stopwatches!" The real guard is the host: phones down for Blind Stop. A hidden random start can't help, because the TV has to show the start for anyone to count. |

### Auction, Stocking Stuffer, Share or Snatch

| Finding | Fix |
| --- | --- |
| Auction never said the highest bid wins, or that a tied number is spent. | "The highest number nobody else picked wins the prize. Every number is used up once you play it, even in a tie." |
| Spent numbers shown only by a strike-through, hard to see across the room. | Spent numbers are struck through and faded. |
| Stocking Stuffer: "coal loses the lot" (the lot of what?), the odds weren't shown, and each team's stocking differs. | "Each team opens its own stocking for points, or banks what it has. 1 in 6 stockings is coal, and coal loses this round's pot!" |
| Share or Snatch: the payout rule was only on the phone, in small grey text. | It's the TV intro now: "Both Share: you split it. One Snatches: they take it all. Both Snatch: nobody gets a thing." |
| The phone said "Your matchup is on the TV" before the TV showed it. | "Your matchup comes up in a moment." |
| A team that shared and got robbed looked like it won (gold "Share · +0"). | A share that scores nothing is in muted ink. |
| Open, Bank, Share and Snatch looked missing. | They weren't: the first packet caught phones that had already chosen. The second packet shows the controls. |

### Memory Path, Present Shuffle, Snowball to 21, Land Mass

| Finding | Fix |
| --- | --- |
| Snowball to 21: "Your turn!" with live buttons during the 3, 2, 1, which the server refused (a real bug). | Nobody's turn shows until the round starts; a test covers it. |
| Snowball to 21: what if a choice goes past 21? | Past-21 buttons were already off; the intro says "never past 21". |
| Memory Path: the path could form 2 × 2 blocks and forks, so "square by square" was ambiguous. | Paths are now one clean line: a square never touches an earlier one except the one before it (a test checks 200 seeds). |
| Memory Path: right squares in the team's color could match the gold path (Iron Cranes are gold); gold lit squares weren't explained; the 5-second step timer had no label; the TV board was small. | Right-so-far squares are white; the TV and phone explain gold and the 5 seconds; the board is bigger. |
| Present Shuffle: "the big present" when every present is the same size. | "Follow the 100-point one"; the count before a round says "Find the 100-point present!" |
| Present Shuffle: taken presents' values were faded with the present. | Only the wrapping fades; the value stays readable. |
| Land Mass: four steps in 20 s, and board squares about 25 px on a phone (rated a blocker for older players). | 30 s a turn; numbered steps ("1. Pick a piece, 2. Tap the board, 3. Place it"); arrow buttons nudge the piece a square at a time, so a rough tap is enough; the "fits" preview is white, not a team color. |
| Land Mass, Memory Path: results cards overflowed beside the board. | Results stack under a smaller board, every card full width. |

## Rules the reviewers questioned (Khai's answers, 2026-11-18)

- **Memory Path:** the first team across ends the round, and getting partway scores nothing. Kept: going early is the chance, but it's hard. Now each round is harder (longer path, less time to learn it). (A55)
- **Share or Snatch:** Snatch was never worse than Share. Now both snatching loses each team 20 game points, and the final order of game points pays the showdown points. (A56)
- **Land Mass:** ranked points were steep. Now every square scores 5, and pieces are more irregular. (A57)

Also noted, not changed:
- **Auction:** the last rounds are forced, and teams can gang up on the leader.
- **Snowball to 21:** teams that can't win can pick the winner (kingmaking).

Both are part of how those games play.

## Known risk, accepted

The TV's view of a round is public, so someone using browser developer tools could
read the Fly-by count, the Memory Path squares or the present values while they're on
the TV. Phones never get them. Closing this would mean signing in on the TV; for a
family party it's left as is.
