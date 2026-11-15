# 23: Game library

**Status:** Ready
**Backlog:** M2
**Depends on:** 07, 08

## Summary

A list of every game type Khai has built, so he can see what's available when planning an event (Khai, 2026-11-15: "a game registry that I can have a list of all the games I've built and choose for the event"). The library is for reference: choosing an event's games stays in its event file, as now (ADR-003), and Khai asks Claude to add or drop games. It lives in two places, both made from one catalog in the code: a **Games** page in the admin and `docs/GAMES.md`. Separately, an event's game can now be turned fully **off**: kept in the event file for later, but off the games list and impossible to open or score.

## User stories

- As the admin, I want to see every game I've built, with a line on what it is, so I can pick games for an event.
- As the admin, I want to turn a game off for one event without deleting it, so I can bring it back for another.
- As a player, I can't reach or score a game that's off, even with its old link.

## Behavior

1. **The catalog.** Every built game type (one with server logic in `lib/games/registry.ts`) has a catalog entry: its type id, a name, and a one-line pitch in plain words (UI_CONVENTIONS, "Game instructions"). A test fails if a built type has no entry, or an entry has no built type.
2. **Admin Games page.** `/admin/games`, behind the admin sign-in, lists every catalog entry: name, pitch and type id (the id is what goes in an event file). Sorted by name. It's linked from the admin home, next to the event list.
3. **`docs/GAMES.md`.** The same list as a table (name, type id, pitch), generated from the catalog by `npm run games:doc`. A test fails if the file doesn't match the catalog, so it can't drift.
4. **Choosing games** stays in the event file (`content/events/<slug>.ts`): Khai asks, Claude edits. Nothing in the admin changes an event's games.
5. **Fully off.** An event's game takes a third visibility, `off`, beside `listed` and `hidden`:
   - `listed`: on the games list, playable (unchanged).
   - `hidden`: off the list, but its link works (unchanged; for unlock codes later, spec 15).
   - `off`: off the list, and its page and its play and move routes answer as if the game weren't in the event (the page shows "game not found"; the routes return 404). Points already earned from it stay in the ledger.
   Controls and the TV don't list `off` games either.
6. **The party.** Geocache, Team Trivia and Jeopardy are `off` at the holiday party (Khai, 2026-11-15), kept in its file for other events.

## Data

- `content/events/*.ts`: a game's `visibility` is `"listed" | "hidden" | "off"`.
- No Firestore change. The catalog is code: `lib/games/catalog.ts`.

## Routes and real-time

- Page `/admin/games` (admin only; signed-out goes to the sign-in, as other admin pages).
- `/[event]/play/[game]` and `POST /api/events/[slug]/games/[gameId]/play` and `/move`: an `off` game is not found (404).

## UI

- **Admin:** the standard admin look (ADR-021). A Games page with one row per game: name in bold, the pitch, the type id in a small code style.
- **Player:** no change, except `off` games never appear and their links show the event's "game not found" page.

## Edge cases

- A game turned `off` mid-party: phones that had it open get 404 on their next move and an error line; points earned stay.
- A catalog entry for a type that's later removed: the catalog test fails until the entry goes too.
- An event file naming a type with no logic (Jeopardy before spec 12): still valid; it's simply not in the library until built.

## Acceptance criteria

- [ ] AC-1: Every built game type has a catalog entry with a name and a one-line pitch, and every entry is a built type.
- [ ] AC-2: `/admin/games` lists every catalog entry, sorted by name, with name, pitch and type id, and is admin-only; the admin home links to it.
- [ ] AC-3: `docs/GAMES.md` is generated from the catalog by `npm run games:doc`, and a test fails if it doesn't match.
- [ ] AC-4: A game with `visibility: "off"` is not on the games list, Controls or the TV, its page shows "game not found", and its play and move routes return 404; `listed` and `hidden` behave as before.
- [ ] AC-5: At the holiday party, Geocache, Team Trivia and Jeopardy are `off`.

## Tests

- Unit: catalog matches the registry (AC-1); the doc matches the catalog (AC-3); `off` in the service returns not-found for start and move (AC-4); the party file (AC-5).
- Component: the hub leaves `off` games out (AC-4).
- E2E: `/admin/games` lists the games when signed in (AC-2); opening an `off` game's link shows "game not found" (AC-4).

## Out of scope

- Choosing, adding or reordering an event's games from the admin (Khai chose reference only).
- Editing game content (questions, photos) in forms.
- Showing which events use each game, how it scores, or a "try it" button.

## Open questions

None open. Answered 2026-11-15: A32–A35 in `OPEN_QUESTIONS.md`.
