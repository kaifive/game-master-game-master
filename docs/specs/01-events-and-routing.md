# 01: Events and routing

**Status:** Done
**Backlog:** M1
**Depends on:** 09 (style packs)

## Summary

Each event is a config file in `content/events/` (ADR-003), served at `/[slug]` in its own style pack, with its games as children. An event is upcoming until the admin starts it, live until the admin ends it, then ended (ADR-024); no dates are shown (ADR-026). Players who land on the bare site get a code box that takes them to the right event. The admin event library moves to the admin area (spec 07), behind sign-in (spec 06).

## User stories

- As a player who scans the QR code, I land on the event's page in the event's style.
- As a player who typed the bare address, I can enter the code from the poster and get to the event.
- As a player who arrives early, I can see what's coming and when it opens.
- As a guest who opens the link after the party, I see the final standings.
- As the admin, I add an event by adding one file, and a mistake in it fails the tests before it ships.

## Behavior

- **Event file:** slug, name, `style` (pack, variant, color mode), `kind` (`event` or `quick`), join code, join policy, scoring mode, games. Codes in the file stay on the server.
- **Status:** stored in `events/{slug}.status` and changed only by the admin (Start and End in Controls, spec 07). With nothing stored, an event is `upcoming`. The clock never changes it.
- **Upcoming:** the page says it's waiting for the host to start the games and lists them, locked (except `alwaysOpen` games, spec 08). Players may join early (join flow: spec 02).
- **Live:** the player hub (filled in by specs 02, 03, 08).
- **Ended:** "Thanks for playing" with final team and player standings from the leaderboard summary, or a short note when there are none. Games are closed.
- **Quick event:** an event with one game; `/[slug]` is that game.
- **Home `/`:** "Scan the QR code at your event, or enter a code." Submitting goes to `/join?code=`. A small "Admin" link goes to `/admin`.
- **`/join?code=`:** an event's join code goes to `/[slug]?code=` (the code rides along for spec 02); game codes join with spec 08; an unknown code goes back home with "We couldn't find that code" and the box ready to retry.

## Data

`EventConfig` in `content/events/<slug>.ts` (`docs/reference/data-model.md`). Status override in `events/{slug}.status`. Final standings read from `leaderboard/{slug}`.

## Routes

`/`, `/join`, `/[event]`, `/[event]/play/[game]` (game body from spec 08). Reserved slugs: `admin`, `api`, `_next`, `join`, `dev`.

## Acceptance criteria

- [x] AC-1: Every file in `content/events/` passes validation: slug format, not reserved, matches its file name, no unknown fields, a valid style (spec 09), a join code in the code format, unique game ids. A broken file fails the tests with a message naming the file and field.
- [x] AC-2: An event is `upcoming` until the admin starts it, `live` until the admin ends it, and `ended` after; with nothing stored it is `upcoming`, and nothing time-based changes it.
- [x] AC-3: An unknown event or game shows a friendly not-found page with a way home.
- [x] AC-4: Every event page renders in the event's style pack and color mode, with its banner showing the event name (no date, ADR-026).
- [x] AC-5: An upcoming event says it's waiting for the host and lists its games as locked.
- [x] AC-6: An ended event shows "Thanks for playing" with final team and player standings from the leaderboard summary, and a short note when there are none; its games can't be opened.
- [x] AC-7: A quick event's page is its one game.
- [x] AC-8: The home page shows the code box and an Admin link; submitting a code goes to `/join?code=` with the code uppercased.
- [x] AC-9: `/join` sends an event's join code to that event (keeping the code), and an unknown code back home with "We couldn't find that code".
- [x] AC-10: Join codes never appear in any page's HTML or client bundle.
- [x] AC-11: The Nova Wushu Holiday Party event file exists (Judges' Table, winter variant, dark mode) and its page renders at phone, tablet and TV sizes without sideways scroll.

## How it's built

- Event files: `content/events/<slug>.ts`, listed in `content/events/index.ts`. Schema and rules: `lib/events` (`EventConfig`, `validateEvent`, `eventStatus`, `resolveJoin`, `toPublicEvent`).
- Server-only entry `lib/events/server.ts`: `getEvent`, `allEvents`, `eventRuntime()` (status and final standings from Firebase, or an empty in-memory store without Firebase outside production or with `GM_ALLOW_NO_FIREBASE=1`).
- Pages get a `PublicEvent` (an allowlist without codes or game content).
- Routes: `app/page.tsx` (code box), `app/join/page.tsx`, `app/[event]/layout.tsx` (the event's pack), `app/[event]/page.tsx`, `app/[event]/play/[game]/page.tsx`, not-found pages.
- Views: `components/events`.

## Tests

Unit tests for config validation (good and broken fixtures) and status; component tests for the upcoming, live, ended and not-found views; route tests for `/join`; a test that no rendered page or client chunk contains a join code; e2e for home, code, event at three sizes.

## Out of scope

Joining and nicknames (02), the admin library and status override UI (06, 07), game bodies and game codes (08), live standings (05).

## Open questions

- None open. Party: Saturday 2026-12-19, started and ended by hand.
