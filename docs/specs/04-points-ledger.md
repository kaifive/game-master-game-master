# 04: Points ledger

**Status:** Done
**Backlog:** M1
**Depends on:** 02, 08

## Summary

Every point movement is an append-only ledger entry written by the server (ADR-006). A player's points and the leaderboard summary are kept up to date from it, and can be rebuilt from it. This first pass covers players; team awards and donations arrive with teams (spec 03), following the rules below.

## Behavior

1. **Game awards.** When a solo game run finishes with a new best, the server awards the improvement: the first finish awards its score, a replay awards only what it beat the best by, and a run that doesn't beat it awards nothing (S08-AC12). Each award's entry id is fixed by its source (`game_{gameId}_{playerId}_{run}`), so a retry can't pay twice.
2. **Manual awards and voids** (used by Controls, spec 07): award or deduct any amount with a reason; void reverses one entry by adding a `void` entry. Entries are never edited or deleted.
3. **A player's points** = awards to them − deductions − voided awards (− donations given, with spec 03). They're stored on the player and changed in the same transaction as the entry.
4. **Leaderboard summary** (`leaderboard/{slug}` in the Realtime Database) has each active player's nickname, team and points, and the most recent awards ("Mai +40 · Holiday Trivia", "Mai +10 · Holiday Trivia · new best"). The server updates it after each entry, one player at a time (no full rescans, to stay inside the free tier).
5. **Starting over** (ADR-027): the old player leaves the leaderboard. Their entries stay in the ledger as history.
6. **Rebuild**: recomputes every player's points from the ledger, fills in any game award that's missing from a finished play (if the server stopped between the two), and rewrites the summary. For Controls (spec 07) and a script.
7. The header total and the player panel show the player's points from the ledger.

## Rules from Khai (for donations, with spec 03)

- A donation can't exceed the player's own points.
- Replaying a game only adds the improvement on the best score, so donating and then replaying can't inflate points: donate 80, replay from 80 to 90, and only 10 comes back.
- Starting over forfeits the old player's points, including donations they gave: those donations are voided from their teams.
- Players may donate to any team, even one they're not on (Q14). In the team phase, solo points still go to the player (Q15).

## Data

- `events/{slug}/ledger/{entryId}`: `kind: "award" | "void"`, `points` (positive or negative for awards; deductions are negative awards), `to: { kind: "player", id }`, `reason`, `source: { kind: "game" | "manual", id }`, `voids?`, `createdAt`, `createdBy: "server" | "admin"`.
- `events/{slug}/players/{playerId}.points`: the running total.
- `leaderboard/{slug}`: `updatedAt`, `players/{id}: { nickname, teamId, points }`, `recent/{entryId}: { playerId, nickname, points, reason, at }`.

## Acceptance criteria

- [x] AC-1: Finishing a game with a new best awards the improvement once; a retry or a worse run awards nothing more.
- [x] AC-2: A manual award or deduction with a reason changes the player's points; a void reverses an entry once; entries are never changed.
- [x] AC-3: A player's points always equal the sum of their ledger entries.
- [x] AC-4: Each entry updates the player's row and the recent awards in the leaderboard summary; a replay's award is marked "new best".
- [x] AC-5: A player who starts over leaves the leaderboard.
- [x] AC-6: Rebuild recomputes points from the ledger, adds missing game awards from finished plays, and rewrites the summary.
- [x] AC-7: The header total shows the player's points from the ledger.
- [x] AC-8: The memory and Firebase points repos pass the same contract, including concurrent awards to one player.

## Tests

- Unit: `lib/points/service.test.ts` with memory repos; the game service awarding on finish.
- Contract: `lib/points/repo.contract.ts` against memory and the Firestore and RTDB emulators.
- E2E: playing trivia raises the header total, and a replay with a better score raises it by the difference.

## Out of scope

- Teams, team awards and donations (spec 03, using the rules above).
- The Controls screens for manual awards, voids and rebuild (spec 07).

## Open questions

- None open.
