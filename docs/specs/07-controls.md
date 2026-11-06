# 07: Controls (admin dashboard)

**Status:** Draft
**Backlog:** M1
**Depends on:** 02, 03, 04, 06

## Summary

The admin's page for running an event, built for quick glances rather than constant watching (ADR-010). Works on a phone so the admin can run the night while walking around.

## In scope (first pass)

- Header counts: players, devices online (presence), teams
- "New since you last looked": new players and team names in one list, with rename, remove and ban inline; one tap marks all seen
- Move a player to a new phone (lost phone); ban a device (moved here from spec 02)
- Each player with their phone and how many times it has started over (one player per phone, ADR-027)
- Fix-ups for players: change a player's points (a manual award or deduction with a reason, spec 04), give a phone more restarts, and reset a player's play of a game so they can play it again
- Phase switch (individual → team); promote and demote captains; move players
- **Clear test data**: one button (with a typed confirm) that deletes an event's players, devices, nicknames, plays, ledger and leaderboard, so test runs don't carry into the party. Only before the event starts.
- Start and End the event; manual award and void (spec 04); display mode switch (spec 05); open and close games
- Photo triage badge with the pending count, linking to spec 13

## Open questions

- An activity feed ("Mai finished Daily Word, +100")? Default: yes, last 50 entries from the ledger.

## Acceptance criteria

To be written when this spec moves to `Ready`.
