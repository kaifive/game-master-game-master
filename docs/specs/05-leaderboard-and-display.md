# 05: Leaderboard and display

**Status:** Done
**Backlog:** M1
**Depends on:** 04

## Summary

A big-screen page for the room shows how to join and a live leaderboard. Players see a lighter leaderboard on their phones. This first pass is the individual leaderboard; team standings come with teams (spec 03), and the display's other modes (live session, slideshow, message) come with Controls (spec 07), Jeopardy (12) and photos (13).

## Behavior

1. **Ranks:** highest points first; ties share a rank (1, 2, 2, 4). Only active players are listed (spec 04 keeps the summary).
2. **Phone** (party page, below the games): the top 10, and your own rank and points underneath when you're outside the top 10. Your row is highlighted. It refreshes every 15 seconds.
3. **TV** (`/[slug]/display`), sized for 1920×1080 with no scrolling:
   - **Join panel:** a QR code for `/join?code=…`, the short URL and the join code in big type. (The display is the one page that shows the join code; it's on the poster anyway.)
   - **Leaderboard:** the top 10 as racing bars (spec 14's `BarRace`): bars grow, rows slide to their new rank and scores count up.
   - **Toasts:** each new award shows as a toast ("Mai +40 · Holiday Trivia", "Mai +10 · Holiday Trivia · new best"), at most four at a time (spec 14).
   - **Lead change:** when someone new takes first place, a callout plays ("Mai takes the lead!").
   - It refreshes every 3 seconds, and the first load shows no toasts or callouts.
4. No sound (A28).

## Routes

- `GET /api/events/[slug]/leaderboard?playerId=` → `{ top: [{ id, rank, nickname, points }], me: { rank, points } | null }` (top 10).
- `GET /api/events/[slug]/display` → `{ players: [{ id, rank, nickname, points }], recent: [{ id, nickname, points, reason, at }] }` (top 10, newest 20 awards).
- Both are public: nicknames and points only.

## UI

Display uses the event's style pack; the whole page scales with the screen width (rem-based) so a 1080p TV reads from across the room and the top 10 fits without scrolling. Tied players share a rank on the bars. Phone uses the pack's `LeaderboardRow`.

## Acceptance criteria

- [x] AC-1: Ranks go highest points first and ties share a rank; only active players are listed.
- [x] AC-2: The phone shows the top 10, highlights the player, and adds their own rank and points below when they're outside the top 10, refreshing every 15 seconds.
- [x] AC-3: The display shows a QR code for the join link, the URL and the join code, and fits 1920×1080 with no scrolling.
- [x] AC-4: The display shows the top 10 as racing bars that update every 3 seconds.
- [x] AC-5: Each new award since the last update shows as a toast, a replay's marked "new best"; the first load shows none.
- [x] AC-6: When a different player takes first place, a lead-change callout plays.

## Tests

- Unit: ranking, the toast and lead-change diff.
- Component: phone leaderboard (top 10, own rank), display panel.
- E2E: the display shows the join panel and a player's points after they play.

## Out of scope

- Team standings and the team phase (spec 03).
- Display modes from Controls (live session, slideshow, message) (spec 07, 12, 13).
- The points-over-time graph: a later pass.

## Open questions

- None open. Replay improvements: a "new best" toast and the row sliding up (A31).
