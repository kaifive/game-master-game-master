# 04: Points ledger

**Status:** Draft
**Backlog:** M1
**Depends on:** 02

## Summary

Every point movement is an append-only ledger entry written by the server (ADR-006): awards, donations and voids. Player totals, team scores and the leaderboard summary are derived from it and can be rebuilt.

## In scope (first pass)

- `award()`, `donate()` and `voidEntry()` in `lib/points`, used by every source
- Player `points` = awards to them − donations they gave (voids reverse)
- Team score = team `ownPoints` (donations received + team awards) + members' points
- Donations: a player gives any amount up to their points to any team, with a confirm; `POST /api/[slug]/donate`
- Totals updated in the same transaction as the ledger entry; RTDB leaderboard refreshed after
- Manual awards and voids from controls, with a reason
- Rebuild totals from the ledger (admin button and script)
- Idempotency: deterministic entry ids per source, so retries can't double-pay

## Open questions

- Q14: can a player donate to a team they aren't on? Default yes.
- Q15: in the team phase, do solo points still go to the player? Default yes.

## Acceptance criteria

To be written when this spec moves to `Ready`.
