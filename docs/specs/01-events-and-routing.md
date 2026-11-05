# 01: Events and routing

**Status:** Draft (acceptance criteria proposed, waiting for Khai's yes)
**Backlog:** M1
**Depends on:** 09 (style packs)

## Summary

Each event is a config file in `content/events/` (ADR-003), served at `/[slug]` in its own style pack, with its games as children. An event is upcoming, live or ended, from its dates or an admin override. Players who land on the bare site get a code box that takes them to the right event. The admin event library moves to the admin area (spec 07), behind sign-in (spec 06).

## User stories

- As a player who scans the QR code, I land on the event's page in the event's style.
- As a player who typed the bare address, I can enter the code from the poster and get to the event.
- As a player who arrives early, I can see what's coming and when it opens.
- As a guest who opens the link after the party, I see the final standings.
- As the admin, I add an event by adding one file, and a mistake in it fails the tests before it ships.

## Behavior

- **Event file:** slug, name, `timeZone`, `startsAt`, `endsAt`, `style` (pack, variant, color mode), `kind` (`event` or `quick`), join code, join policy, scoring mode, games. Codes in the file stay on the server.
- **Status:** `upcoming` before `startsAt`, `live` until `endsAt`, then `ended`. An admin override (`events/{slug}.status`, set from Controls in spec 07) wins.
- **Upcoming:** the page shows when it opens (in the event's time zone) and the games, locked. Players may join early (join flow: spec 02).
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

- [ ] AC-1: Every file in `content/events/` passes validation: slug format, not reserved, matches its file name, `endsAt` after `startsAt`, a valid time zone, a valid style (spec 09), a join code in the code format, unique game ids. A broken file fails the tests with a message naming the file and field.
- [ ] AC-2: An event's status is `upcoming` before it starts, `live` until it ends and `ended` after; an admin override wins over the dates.
- [ ] AC-3: An unknown event or game shows a friendly not-found page with a way home.
- [ ] AC-4: Every event page renders in the event's style pack and color mode, with its banner showing the event name and date in the event's time zone.
- [ ] AC-5: An upcoming event shows when it opens and lists its games as locked.
- [ ] AC-6: An ended event shows "Thanks for playing" with final team and player standings from the leaderboard summary, and a short note when there are none; its games can't be opened.
- [ ] AC-7: A quick event's page is its one game.
- [ ] AC-8: The home page shows the code box and an Admin link; submitting a code goes to `/join?code=` with the code uppercased.
- [ ] AC-9: `/join` sends an event's join code to that event (keeping the code), and an unknown code back home with "We couldn't find that code".
- [ ] AC-10: Join codes never appear in any page's HTML or client bundle.
- [ ] AC-11: The Wushu Holiday Party event file exists (Judges' Table, winter variant, dark mode) and its page renders at phone, tablet and TV sizes without sideways scroll.

## Tests

Unit tests for config validation (good and broken fixtures) and status; component tests for the upcoming, live, ended and not-found views; route tests for `/join`; a test that no rendered page or client chunk contains a join code; e2e for home, code, event at three sizes.

## Out of scope

Joining and nicknames (02), the admin library and status override UI (06, 07), game bodies and game codes (08), live standings (05).

## Open questions

- Q22: Party start time and time zone? Default 6 to 10 pm, America/Los_Angeles.
