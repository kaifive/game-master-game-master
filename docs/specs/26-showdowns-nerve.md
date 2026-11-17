# 26: Showdowns: nerve games (Auction, Stocking Stuffer, Share or Snatch)

**Status:** Draft (agreed with Khai 2026-11-17; marked Ready in the PR that builds it, since check:ac makes Ready mean its tests exist)
**Backlog:** M3
**Depends on:** 11, 24

## Summary

Three showdowns about nerve and reading the room: bid numbers you can only use once, open stockings until you bank or hit coal, and share or snatch a pot with another team.

## Behavior

Every game here follows spec 24: the host's steps, who's up and rotation, the TV demo, fair play (shared leads, shared clock starts, secret answers), points to teams through the ledger, a mock play-test suite and a blind review.

### Auction (`auction`)

1. Content: number of rounds (default 10), prize values (default 10 to 100, dealt from the seed), seconds to bid (default 15).
2. Each team has the numbers 1 to 10, and **each number can be used once per game** (Khai, 2026-11-17). The phone shows the ones left.
3. A round: the TV shows the prize. Every team secretly picks one of its numbers. Then the TV reveals the bids: **numbers that tie cancel each other out, and the highest bid that nobody tied wins the prize.** If every bid ties, nobody wins it. A team that doesn't bid in time spends its lowest number left.
4. **Points: the prizes a team won.** The TV keeps a running total and shows which numbers each team has left.

### Stocking Stuffer (`stockings`)

1. Content: number of rounds (default 5), stocking values (default 5 to 30), how often coal turns up (default 1 in 6), seconds to choose (default 10).
2. A round: every team still in taps **Open** or **Bank** at the same time. Each team that opens gets its own stocking from the seed, revealed on the TV: points go into that team's pot for the round, or **coal empties the pot and the team is out until the next round**. A team that banks keeps its pot and sits out the rest of the round. No choice in time counts as Bank.
3. The round ends when every team has banked or hit coal. **Points: everything a team banked.**

### Share or Snatch (`snatch`)

1. Three rounds with an even number of teams; with an odd number, one round per team, each team sitting out exactly once (spec 24, "Fair for every team"). Each round the teams are paired at random, never the same pair twice in a game if it can be helped.
2. Each pair plays for a pot of 100, shown on the TV with both team names. Each team secretly taps **Share** or **Snatch** within 15 s (no choice counts as Share). The TV reveals both at once.
3. **Points: both share, 50 each; one snatches, that team gets 100 and the other 0; both snatch, 0 each.**

## Data

Each game's content is validated in the event file and its round state lives in the live session (spec 11). Seeds come from the session, so a round can be replayed in tests.

## UI

- **TV:** the round as described above, then the reveal with every team's answer and points.
- **Captain phone:** one clear control for the round; locked and waiting states.
- **Demo:** each game's looping TV demo and one line of text (spec 24).

## Acceptance criteria

- [ ] AC-1: Auction gives each team the numbers 1 to 10 once each, takes one secret bid a round (the lowest left if none), cancels tied bids, gives the prize to the highest untied bid (nobody if all tie), and pays the prizes won.
- [ ] AC-2: Stocking Stuffer takes Open or Bank from every team at once each round (Bank if no choice), reveals each opener's seeded stocking, empties a team's pot and puts it out for the round on coal, ends the round when all have banked or busted, and pays what each team banked.
- [ ] AC-3: Share or Snatch pairs teams at random for three rounds (one round per team with an odd number, each team sitting out exactly once), takes one secret Share or Snatch per team (Share if none), and pays 50/50, 100/0 or 0/0.

## Tests

- Unit: each game's dealing and scoring from a seed, and its edge rules.
- Play tests: `lib/live/<type>/playtest.test.ts` on spec 24's bot harness: 2, 3, 5 and 8 teams; perfect, random, cautious, reckless, silent, late and dropped-out teams; ties. Scenarios include all teams bidding the same, everyone snatching, and everyone banking at once.
- Component: the TV view and the phone controller for each game.
- E2E: one game of each type with two captain phones, the TV and Controls.
- Blind review: findings and fixes in `docs/reviews/showdowns.md`.

## Out of scope

- Other showdown types (`docs/reference/game-ideas.md`).
