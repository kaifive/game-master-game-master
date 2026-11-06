# 02: Player join and identity

**Status:** Done
**Backlog:** M1
**Depends on:** 01

## Summary

Players join an event from a QR code with a nickname and start playing at once. The phone is a device (Firebase anonymous uid) with one player per event; starting over as someone new forfeits the old player, within a limit (ADR-027). Moderation works without the admin watching the door (ADR-010): a name filter at the door, and kick or ban later from Controls (spec 07).

## User stories

- As a player, I want to scan the QR code, type my name and be in, with no account.
- As the admin, I don't want players making new players to replay games or dodge a low score.
- As the admin, I want rude names stopped at the door, since I can't watch everyone join.

## Behavior

1. The event page signs the phone in anonymously on first visit. The uid is the device and survives reloads.
2. The hub shows "Join the party" while the device has no player in this event. Joining needs a nickname and the event's join code. A `?code=` in the URL fills the code in and hides the code box (the QR poster links to `/join?code=…`, which redirects with the code kept).
3. Nicknames are trimmed and inner spaces collapsed. 2–16 characters; letters (any language), numbers, spaces and `' - . _` only.
4. Nicknames are unique per event, ignoring case, spacing and accents ("Mai", "mai", "Maï" are the same name). A taken name gets "That name is taken. Pick another name."
5. The name filter (`lib/players/filter.ts`) normalizes before matching: lower case, accents removed, look-alikes mapped (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s, !→i), separators removed, repeated letters collapsed. Strong words are blocked anywhere in the name; short ambiguous words are blocked only as a whole word, so "Cassie" and "Dickens" pass. An event may add its own words (`blockedNames`), which stay on the server. The phone checks the shared list as the name is typed; the server checks again, with the event's words too. A blocked name gets "Pick another name."
6. Joining works while the event is `upcoming` or `live`, not once it is `ended`.
7. A device has **one player** per event (ADR-027). Joining again with another name is refused: "This phone already has a player. Start over to play as someone new."
8. The hub shows "Playing as <name>" and, while the phone has restarts left, **Not you? Start over**. It confirms first: "<name>'s N points will be lost[, including any given to teams]. This phone can only start over once at this party." (the team part only when the event has teams). Then a name box (no code); the old player is forfeited (off the leaderboard, name freed) and the new one becomes the phone's player. `restartsPerDevice` in the event file sets the limit (the party: 1).
9. Reopening the event on the same device shows its player with no new join.
12. Team captains can't start over (spec 03 marks captains; until then nobody is one).
10. A banned device (`devices/{uid}.banned`, set from Controls in spec 07) can't join and sees "This phone can't join this event."
11. Only the server writes players. The phone sends its Firebase ID token; the server verifies it and uses its uid as the device. Firestore and RTDB rules stay deny-all for clients.

## Data

Owns, in Firestore (`reference/data-model.md`):

- `events/{slug}/devices/{uid}`: `banned`, `playerId` (current), `restarts`, `playerIds` (every player it has had)
- `events/{slug}/players/{playerId}`: `deviceUid`, `nickname`, `nicknameKey`, `status: "active" | "forfeited"`, `teamId: null`, `points: 0`, `joinedAt`
- `events/{slug}/nicknames/{nicknameKey}`: `playerId`

`nicknameKey` is the name in lower case with accents, spaces and `' - . _` removed, and any letter outside a–z kept as `-` plus its code point in base 36, so it is always a safe document id (at most 64 characters).

Joins and restarts run in one Firestore transaction (device, nickname and players together), so two phones racing for one name can't both get it.

Adds `blockedNames?: string[]` to `EventConfig`.

## Routes and real-time

All need `Authorization: Bearer <Firebase ID token>`; a missing or bad token is `401 NOT_SIGNED_IN`.

- `GET /api/events/[slug]/device` → `{ banned, player: { id, nickname } | null, restartsLeft }`
- `POST /api/events/[slug]/players` with `{ nickname, code?, restart? }` → `201 { player: { id, nickname } }`. Errors: `400 BAD_REQUEST` (name rules), `403 FORBIDDEN` (wrong code, banned, ended), `404 NOT_FOUND` (event), `409 CONFLICT` (name taken, phone has a player, no restarts left); `403` also for a captain starting over.

No listeners yet.

Without Firebase (CI e2e, local runs with no emulators) the server uses in-memory repos and accepts `dev:<id>` device tokens, which the phone makes and keeps in local storage. Production refuses both.

## UI

Player phone, in the event's style pack, above the game list on the upcoming and live pages: a `Panel` with a name box (and code box when needed), the live filter message, and the join `Button`. After joining, a "Playing as" line with "Not you? Start over" while restarts are left.

## Edge cases

- Same name typed twice on the same device: returns that player instead of an error.
- Double-tap on Join: the button disables while the request runs.
- Token expired: the Firebase SDK refreshes it; the route verifies each call.
- Event ended while the join form is open: the server refuses with a clear message.

## Acceptance criteria

- [x] AC-1: A new phone is signed in as a device on first visit, and after a reload the hub still shows that device's players.
- [x] AC-2: A player joins with a nickname and the event's join code; with `?code=` in the URL the code is filled in and its box hidden; a wrong code gets "That code isn't right for this event."
- [x] AC-3: Nicknames are trimmed and spaces collapsed, must be 2–16 characters, and allow only letters, numbers, spaces and `' - . _`, each failure with a plain message.
- [x] AC-4: Nicknames are unique per event ignoring case, spacing and accents; a taken name gets "That name is taken. Pick another name."
- [x] AC-5: The name filter blocks listed words through look-alikes, separators, repeats and accents, blocks short words only as whole words (so "Cassie" passes), applies the event's `blockedNames`, and shows its message while the name is typed.
- [x] AC-6: A phone has one player per event; there is no Add player or Switch player, and a second name without starting over is refused.
- [x] AC-7: Start over confirms what will be lost (donations only when the event has teams), needs no code, forfeits the old player and frees their name, and is limited by `restartsPerDevice`.
- [x] AC-8: Joining again with the same name on the same device returns the same player.
- [x] AC-9: A banned device can't join and sees "This phone can't join this event."
- [x] AC-10: Joining is open while the event is upcoming or live and refused once it has ended.
- [x] AC-11: Player routes refuse requests without a valid device token (401), and production refuses dev tokens and in-memory storage.
- [x] AC-12: The memory and Firebase player repos pass the same contract, including two devices racing for one name (exactly one wins).
- [x] AC-13: A team captain can't start over.

## Tests

- Unit: `lib/players/rules.test.ts`, `filter.test.ts`, `service.test.ts` (memory repo), `identity.test.ts`.
- Contract: `lib/players/repo.contract.ts` run against memory (unit) and Firebase (`firebase/tests/players.test.ts`, emulators).
- Component: `components/players/hub.test.tsx`.
- E2E: `e2e/join.spec.ts` (join, reload, start over, wrong code, taken name, rude name).

## Out of scope

- Admin actions (rename, remove, ban, move to a new phone): spec 07.
- Approval lobby (`joinPolicy: "approval"`): later; the party uses instant join.
- Joining straight into a game from a game code: spec 08.
- Code-guess rate limiting (ADR-020): spec 08, with game codes.
- Several players per phone (ADR-009, superseded by ADR-027).

## Open questions

- None open. Names are a plain text box (ADR-013).
