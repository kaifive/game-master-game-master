# 07: Controls (admin dashboard)

**Status:** Done
**Backlog:** M1
**Depends on:** 02, 04, 06

## Summary

The admin's page for running an event, built for quick glances rather than constant watching (ADR-010). Works on a phone so the admin can run the night while walking around.

### First pass (this build)

1. **Event library** at `/admin`: every event with its status, linking to its Controls at `/admin/[slug]`.
2. **Start and End.** Upcoming → **Start** → live → **End** (confirm) → ended. **Reopen** (confirm) takes an ended event back to live, for mistakes. The status is stored in `events/{slug}.status` (ADR-024).
3. **Players:** every active player with their points, how many times their phone has started over, and when they joined, newest first, with a name search.
4. **Fix-ups per player**, each with a reason where it changes points:
   - **Change points:** add or take away any amount (a manual award, spec 04).
   - **Give another restart:** the phone may start over once more.
   - **Reset a game:** deletes their play of one game so they can play it fresh, and voids the points that game gave them, so the new run can't double up.
   - **Remove:** the player leaves the event and the leaderboard, their name is freed, and their phone can join again.
   - **Ban phone:** the phone can't join again, and its player is removed.
5. **Rebuild points** (spec 04) for when totals look wrong.
6. **Clear test data**, only while the event is upcoming, after typing CLEAR: deletes the event's players, devices, nicknames, plays, ledger and leaderboard. It can't be undone.
7. Controls use the standard admin look (ADR-021) and work on a phone.
8. **Leaderboard on phones / on the TV:** two switches in the Event card show or hide the standings, separately, say to keep the winners secret for a reveal. Hidden on phones, the Leaderboard tab says "The host is keeping the scores secret for now" and the server sends no standings (players still see their own total). Hidden on the TV, the board says "Scores are secret for now", with no latest points or toasts, and old awards aren't replayed when it comes back. Final standings still show once the event ends. Stored as `events/{slug}.boardHiddenOnPhones` / `boardHiddenOnTv` and published in the teams summary (ADR-031), so phones never read Firestore to check.

## Later passes

- "New since you last looked", presence counts, an activity feed.
- Phase switch, captains and moving players between teams (spec 03).
- Display mode switch (spec 05), open and close single games, photo triage (spec 13).
- Move a player to a new phone.

## Acceptance criteria

- [x] AC-1: Signed in, `/admin` lists every event with its status and links to its Controls.
- [x] AC-2: Start makes an upcoming event live; End (after a confirm) ends it; Reopen (after a confirm) makes an ended event live again.
- [x] AC-3: The players list shows every active player with points, restarts used and join time, newest first, filterable by name.
- [x] AC-4: Change points adds a manual award or deduction with a reason, and the player's points and the leaderboard update.
- [x] AC-5: Give another restart lets that phone start over once more.
- [x] AC-6: Reset a game deletes that play and voids the points it gave, so the player can play it fresh.
- [x] AC-7: Remove takes the player off the event and leaderboard and frees their name; Ban phone also stops the phone joining again.
- [x] AC-8: Rebuild points runs spec 04's rebuild.
- [x] AC-9: Clear test data, only while upcoming and after typing CLEAR, deletes the event's players, devices, nicknames, plays, ledger and leaderboard.
- [x] AC-10: Every Controls route needs an admin session (spec 06).
- [x] AC-11: The host hides or shows the leaderboard on phones and on the TV separately; while hidden, no standings reach that screen, and showing it again doesn't replay old awards.

## Tests

- Unit: `lib/admin/service.test.ts` with memory repos; new repo methods in their contracts (memory and Firebase).
- E2E: sign in, start the event, a player joins and plays, change their points, reset their game, remove them, end the event; clear test data.

## Open questions

- An activity feed ("Mai finished Daily Word, +100")? Default: yes, last 50 entries from the ledger.

## Acceptance criteria

To be written when this spec moves to `Ready`.
