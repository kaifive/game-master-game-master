# 05: Leaderboard and display

**Status:** Draft
**Backlog:** M1
**Depends on:** 03, 04

## Summary

A big-screen page for the room shows the join QR code and a live leaderboard, and switches to the live session or a photo slideshow when one is running. Players see a lighter leaderboard on their phones.

## In scope (first pass)

- `/[slug]/display`: join QR code, URL and join code; standings that fit the phase (players in the individual phase, teams in the team phase)
- Animated rank changes; fits 1920×1080 with no scrolling
- Modes set from controls: leaderboard, live session (spec 12), photo slideshow (spec 13), message ("Break, back at 8pm")
- Player hub: own points and rank, team score and rank, top 10, polled every 15 s

## Open questions

- Q8: full leaderboard on phones or top 10 plus own rank?
- Q9: sound on the display?

## Acceptance criteria

To be written when this spec moves to `Ready`.
