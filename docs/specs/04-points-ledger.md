# 04: Points ledger

**Status:** Draft
**Backlog:** M1
**Depends on:** 02, 03

## Summary

Every point is an append-only ledger entry written by the server (ADR-006). Player and team totals and the leaderboard summary are derived from it and can be rebuilt.

## In scope (first pass)

- `award()` and `voidAward()` in `lib/points`, used by every source
- Totals updated in the same transaction as the ledger entry
- RTDB leaderboard summary refreshed after each award
- Manual awards and voids from controls, with a reason
- Rebuild totals from the ledger (admin button and script)
- Idempotency: an award has a deterministic id per source, so retries can't double-pay

## Open questions

- Q3: do solo game points go to the player, team, or both?

## Acceptance criteria

To be written when this spec moves to `Ready`.
