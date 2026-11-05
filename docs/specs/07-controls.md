# 07: Controls (admin dashboard)

**Status:** Draft
**Backlog:** M1
**Depends on:** 02, 03, 04, 06

## Summary

The admin's page for running an event, built for quick glances rather than constant watching (ADR-010). Works on a phone so the admin can run the night while walking around.

## In scope (first pass)

- Header counts: players, devices online (presence), teams
- "New since you last looked": new players and team names in one list, with rename, remove and ban inline; one tap marks all seen
- Players grouped by device; a device with many players stands out
- Phase switch (individual → team); promote and demote captains; move players
- Manual award and void (spec 04); display mode switch (spec 05); open and close games
- Photo triage badge with the pending count, linking to spec 13

## Open questions

- An activity feed ("Mai finished Daily Word, +100")? Default: yes, last 50 entries from the ledger.

## Acceptance criteria

To be written when this spec moves to `Ready`.
