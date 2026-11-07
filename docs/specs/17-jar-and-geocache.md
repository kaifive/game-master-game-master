# 17: Guessing Jar and Geocache

**Status:** Done
**Backlog:** M2
**Depends on:** 04, 07, 08

## Summary

Two games that don't score the moment you finish. **Guessing Jar**: one guess at how many things are in a real jar; points come when the host enters the real count, by how close each guess is. **Geocache**: codes hidden around the venue (on paper or as QR codes); typing one in scores it at once, once per player. Khai's answers (2026-11-07) set the rules.

## Behavior

### Guessing Jar (`jar`)

1. Content: a `prompt` ("How many candies are in the jar?") and an optional picture. One guess per player, a whole number; it can't be changed and the game can't be replayed, even in a replayable event.
2. After guessing, the phone shows the guess and "Points come when the host reveals the jar."
3. In Controls, the host loads the jar's guesses (on request, since it reads every play), enters the real count and taps **Score the jar** (with a confirm). Each guess earns `soloGamePoints × max(0, 1 − %off ÷ 50)`: exact earns all, 2 points fewer per 1% off (at 100 points), 0 at 50% off or more. Points land in the ledger at once, so the TV announces them and the phones' totals update.
4. Controls then lists the closest guesses (name, guess, points). Entering a different count re-scores: earlier jar points are voided and the new ones awarded.
5. Once scored, the guesser's phone shows their guess, the real count, how far off and the points.

### Geocache (`cache`)

6. Content: `caches`, each with an `id`, a host-only `label` (where it's hidden) and a `code`. Codes and labels never reach phones.
7. The phone has one code box. A right code scores that cache's share (`soloGamePoints ÷ caches`) at once, once per player; the same code again says it's already found; a wrong code says so. After 5 wrong codes in a row the box waits 30 seconds.
8. Points arrive per cache, not at the end: the play stays open until every cache is found, and the header total updates at once. It isn't replayable, and leaving it doesn't ask first (no clock runs).
9. The phone shows how many caches are found out of the total, and the label of each one found.

### Both

10. The games list shows the jar as scored only once it's scored; Geocache shows its points so far on its card while there are caches left.

## Data

- Jar play `state`: the guess, and once scored the real count and points. No new collections; the host's count isn't stored apart from the plays.
- Cache play `state`: found cache ids, consecutive misses and the lock time.
- Ledger: jar awards are game awards (`source: game`), so rebuild keeps them; cache awards are game awards keyed by the cache.

## UI

Phone: a big number box and **Lock in my guess** (with a confirm, since it's final) for the jar; a code box and **Check code** for Geocache, with found caches as score cards. Controls: a **Guessing Jar** card per jar game with **Show guesses**, the count box and **Score the jar**, and the closest guesses after.

## Acceptance criteria

- [x] AC-1: Jar and Geocache content are validated; Geocache codes are unique and never sent to phones.
- [x] AC-2: A jar takes one whole-number guess, can't be changed or replayed, and shows it's waiting for the reveal.
- [x] AC-3: Scoring the jar awards each guess `points × max(0, 1 − %off ÷ 50)` through the ledger, lists the closest guesses, and re-scoring voids the old points first.
- [x] AC-4: A right Geocache code scores its share at once and only once; a found or wrong code says so; 5 wrong codes in a row wait 30 seconds.
- [x] AC-5: The games list shows a scored jar's points, and Geocache's points so far while it's open; neither offers Again.
- [x] AC-6: The party's event file has a jar and a Geocache with placeholder codes, and both play end to end.

## Tests

- Unit: each logic, the jar scoring service (memory repos), progressive awards in the game service.
- Component: the jar and code screens; the Controls jar card.
- E2E: guess, score from Controls, see the points; find a code.

## Out of scope

- Game codes that open or unlock other games (spec 15).
- Showing the jar's closest guesses on the TV (the awards' toasts announce them).
