# 08: Game framework

**Status:** Draft
**Backlog:** M2
**Depends on:** 04

## Summary

The contract every game type follows (ADR-007): pure logic, a content shape, and a themeable renderer. Scored solo games run their logic on the server through one shared move route, so answers never reach the client.

## In scope (first pass)

- `GameType` interface: `create(content, seed)`, `applyMove(state, move)`, `isOver(state)`, `score(state, scoring)`, `publicView(state)`
- Registry of game types; event config validation per type
- `POST /api/[slug]/games/[gameId]/move` runs logic server-side and stores `plays/{gameId}_{uid}`
- Score once per player per game; replays are practice
- Open and close times; admin can open or close any game
- Game codes (ADR-020): `open` codes jump straight to a game; `unlock` codes reveal hidden or locked games, per player or for the whole event; codes from `/join`, the hub's code box or `?code=`; rate-limited; codes never sent to clients
- Admin: see each game's codes and their hiding-place labels, generate or rotate a code, show a code on the TV
- Player hub game list with done, new and locked states

## Open questions

- Should practice replays exist at all for the party, or one play per game?

## Acceptance criteria

To be written when this spec moves to `Ready`.
