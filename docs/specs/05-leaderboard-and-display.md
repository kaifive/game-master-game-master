# 05: Leaderboard and display

**Status:** Draft
**Backlog:** M1
**Depends on:** 04

## Summary

A big-screen page for the room shows the join QR code and a live leaderboard, and switches to the live session view when one is running. Players see a lighter leaderboard on their phones.

## In scope (first pass)

- `/[slug]/display`: join QR code and URL, team standings, top players
- Animated rank changes; fits 1920×1080 with no scrolling
- Modes: leaderboard, live session (spec 12), message ("Break, back at 8pm") set from controls
- Player hub: own points and rank, team rank, top 10, polled every 15 s

## Open questions

- Q8: full leaderboard on phones or top 10 plus own rank?
- Q9: sound on the display?

## Acceptance criteria

To be written when this spec moves to `Ready`.
