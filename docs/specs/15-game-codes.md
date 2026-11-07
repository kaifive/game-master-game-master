# 15: Game codes and hidden games

**Status:** Draft
**Backlog:** Later (the holiday party has every game open)
**Depends on:** 08

## Summary

Codes that jump straight to a game or unlock a hidden one (ADR-020), split out of spec 08 so the first games aren't blocked on them. Covers the Ornament Hunt (scavenger hunt) style of game.

## In scope (first pass)

- `open` codes jump straight to a game; `unlock` codes reveal hidden or locked games, per player or for the whole event
- Codes from `/join`, the hub's code box or `?code=`, kept through the join flow; joining from a game code
- Rate-limited per device; codes never sent to clients; stop working once the event ends (Q21)
- Admin: each game's codes and hiding-place labels, generate or rotate a code, show a code on the TV

## Open questions

- Q20, Q21 in `OPEN_QUESTIONS.md`.

## Acceptance criteria

To be written when this spec moves to `Ready`.
