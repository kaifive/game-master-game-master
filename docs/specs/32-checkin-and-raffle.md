# 32: Check-in and raffle

**Status:** Ready
**Backlog:** M4
**Depends on:** 05 (display), 06 (admin sign-in), 07 (Controls), 24 (TV screens and host bar)

## Summary

Guests are checked in at the door from the RSVP list, which Khai uploads as a
CSV. Anyone not on the list is added by hand. Everyone checked in has one raffle
ticket, and Khai can give a guest extra tickets (paid in person, say). The
raffle is a third TV screen next to Leaderboard and Showdown: names flip past
fast until the host presses space, clicks, or taps Stop in Controls. The server
then draws a ticket at random and the names slow to a stop on the winner.
Claimed uses up that one ticket; Not here skips the person for this prize only.
Then the next raffle can start.

## User stories

- As Khai, I want to upload the RSVP spreadsheet so the door team has every name before guests arrive.
- As a door helper, I want to find a family and check them all in with one tap, unticking anyone who didn't come.
- As a door helper, I want to add a guest who didn't RSVP in a few seconds.
- As Khai, I want to give a guest extra raffle tickets when they buy them.
- As Khai, I want to run several raffles from the TV laptop or my phone, with suspense, and know the draw is fair.
- As a guest, I want to see my name come up on the big screen.

## Behavior

### The guest list

1. Each event has one guest list. A **guest** has a name, an optional family, whether they're checked in, how they got on the list (`list` from the CSV, `door` by hand), extra tickets (0 or more) and tickets won (0 or more).
2. **Upload (Controls, admin only).** Khai picks a `.csv` file.
   - One column: each row is a guest's name, with no family.
   - Two or more columns: the first is the family, the second the name; later columns are ignored. An empty family means no family.
   - A first row reading `name`, `family`, `family,name` or `name,family` (any case) is a header and skipped. With `name,family` the columns swap.
   - Fields are trimmed and may be quoted (`"Nguyen, Khai"`). Blank rows and rows with no name are skipped.
   - At most 1000 rows; names and families at most 60 characters. A longer file or field is refused with a plain message, and nothing is changed.
3. **Merge on upload (Khai, 2026-11-25).** A guest matches an existing one when family and name match, ignoring case, accents and extra spaces.
   - Matches keep their check-in, tickets and wins.
   - New names are added, not checked in.
   - Names on the list but not in the file are kept, listed after the upload as "Not in this file", each with a Remove button.
   - The result says "Added 12, already there 64, not in this file 3."
4. **Check in (check-in page or Controls).**
   - Tapping a family's Check in all checks in every member.
   - Each person has their own tick, to check them in or out.
   - Checking out takes the guest out of the raffle; a guest who has won keeps their wins.
5. **Add a guest (check-in page or Controls).**
   - Name required, family optional.
   - Added checked in, from `door`.
   - A name that matches an existing guest (same family and name) isn't duplicated; that guest is checked in instead, and the page says "Already on the list: checked in."
6. **Extra tickets (Controls, admin only).** Plus and minus on a guest set extra tickets from 0 to 99.
7. **Remove (Controls, admin only)** deletes a guest after a confirm.

### Who can check in

8. **Check-in code (Khai, 2026-11-25).** The check-in page asks for a check-in code, set as `CHECKIN_PASSPHRASE` on the server.
   - Right code: a signed `gm_checkin` cookie for 24 hours, scoped to check-in only.
   - The admin session also opens the check-in page.
   - Wrong codes are rate-limited as admin sign-in is (spec 06).
   - Without `CHECKIN_PASSPHRASE`, only the admin can check in.
   - The check-in code can't open Controls, upload, set tickets or remove guests.
9. Several phones can check in at once; each change is a server transaction, so two helpers ticking the same family can't undo each other's ticks for other members.

### Tickets and the draw

10. A checked-in guest holds **1 + extra − won** tickets, never below 0. A guest not checked in holds none.
11. **A raffle** is one prize. Its draws keep going until someone claims. A raffle remembers who was skipped as Not here; a new raffle starts with nobody skipped.
12. **The draw is fair (Khai, 2026-11-25: "as fair as possible").**
    - The winner is picked by the server, at the moment Stop is pressed, from every ticket held by guests not skipped in this raffle.
    - Each ticket has an equal chance: a guest with 3 tickets is 3 times as likely as one with 1.
    - It uses a cryptographically secure random number (`crypto.randomInt`).
    - The flipping names are decoration only: what's showing when Stop is pressed doesn't affect the pick.
13. **Steps**, by the host from Controls or a signed-in TV:
    - **Start** (only when nobody is being drawn): the names start flipping on the TV. Refused with "Nobody left to draw." when no tickets remain, and with "End the showdown first." while a showdown runs.
    - **Stop** (while flipping): the server draws the winner and records when the names land, 3.5 s later. Until then every screen eases the names to a stop on the winner.
    - **Claimed** (once a winner has landed): that guest's `won` goes up by 1, using up one ticket. The raffle ends; the next Start begins a new raffle.
    - **Not here** (once a winner has landed): that guest is skipped for the rest of this raffle (Khai, 2026-11-25), keeps their tickets for later raffles, and the names start flipping again at once.
14. **The raffle screen.** The host switches the TV to Raffle from Controls or the TV host bar, as with Leaderboard and Showdown (S24-AC9). Starting a raffle switches it there.
15. **Space or click on a signed-in TV.** On the raffle screen:
    - While idle, space or a click starts.
    - While flipping, space or a click stops.
    - While landing or landed, they do nothing.
    - Claimed and Not here are buttons in the TV host bar, never space or click, so a stray key can't claim a prize.
    - A TV that isn't signed in only shows.
16. Each step carries the draw it was pressed on, as Next does (S24-AC1). A Stop or Claimed pressed twice, or on two devices, does nothing the second time.

## Data

Update `reference/data-model.md`.

```
Firestore
events/{slug}/guests/list            the whole guest list, one document (ADR-047)
  guests: [{ id, name, family: string | null, key, checkedIn: boolean,
             checkedInAt: number | null, source: "list" | "door",
             extra: number, won: number }]
  updatedAt

Realtime Database
guests/{slug}                        mirror of the list as one JSON string, written by
                                     the server after every change; the check-in page
                                     and Controls poll it through the API (ADR-031 pattern)

live/{slug} (the live document, spec 11)
  screen: "leaderboard" | "showdown" | "raffle"
  raffle: {
    drawId: string                   new for every Start
    raffleId: string                 new when a raffle begins; kept through Not here
    status: "idle" | "flipping" | "landing" | "landed"
    startedAt: number | null
    landsAt: number | null           Stop's time + 3500 ms
    winner: { guestId, name } | null set at Stop
    skipped: string[]                guest ids skipped this raffle
  } | null
```

`key` is the normalized `family|name` used for merging. Clients never read
or write any of this directly; every read and write goes through the API.
Update `reference/security-rules.md`: `guests/{slug}` is server-only.

## Routes and real-time

| Route | Who | Body | Response |
|---|---|---|---|
| `POST /api/events/[slug]/checkin/session` | anyone | `{ passphrase }` | 204 + `gm_checkin` cookie; 401, 429 as spec 06 |
| `GET /api/events/[slug]/guests` | check-in or admin | | `{ guests, here, total }` |
| `POST /api/events/[slug]/guests` | check-in or admin | `{ action: "checkIn", ids, checkedIn }` or `{ action: "add", name, family? }` | the list |
| `POST /api/admin/events/[slug]/guests` | admin | `{ action: "upload", csv }`, `{ action: "tickets", id, extra }`, `{ action: "remove", id }` | the list, plus `{ added, kept, missing }` after an upload |
| `POST /api/admin/events/[slug]/live` | admin | `{ action: "raffle", step: "start" \| "stop" \| "claim" \| "notHere", drawId? }`, and `screen: "raffle"` | the Controls live view |

- The public live view (spec 11) adds the raffle when the screen is Raffle: `status`, `landsAt`, the winner's name once stopped, and `names`. `names` is up to 60 names drawn at random from those holding tickets, refreshed on each Start, for the TV to flip through. It never includes skipped guests or guests with no tickets.
- The TV polls as it does for showdowns (`LIVE_POLL_MS`), and fetches at `landsAt`.
- The check-in page polls the list every 5 s while open.

## UI

### Check-in page (`/[event]/checkin`, phone first)

- Signed out: a check-in code field and a Check in button. No tab bar, no game UI.
- Signed in:
  - The title "Check-in" with "42 of 80 here".
  - A search box that filters by name or family as you type.
  - The list, grouped by family and sorted by family, then name.
    - A family row has the family name and a **Check in all** button, which reads "All here" when everyone's in.
    - Each person has a 44 px tick and their name; a door-added guest shows a small "Added at the door".
    - Guests with no family are listed by name.
  - **Add someone** at the bottom: name, family (optional), Add.
- Every table and list works at 375 px with no page-level sideways scroll.

### Controls (`/admin/[event]`)

- **Guests card:**
  - Upload CSV (file picker) with the upload result and the "Not in this file" list.
  - "42 of 80 here".
  - A link to the check-in page.
  - A searchable list with check-in ticks, tickets (− / +, showing tickets left), and Remove behind a confirm.
- **Raffle card:**
  - "On the TV: Raffle" switch.
  - Start / Stop, then Claimed and Not here once a winner has landed.
  - "61 tickets, 54 people in the draw" (not counting skipped guests).
  - The current winner, once landed.

### TV raffle screen (`/[event]/display`, screen Raffle)

- **Idle:** the title "Raffle", "54 people · 61 tickets", and "Get ready…".
- **Flipping:** one name at a time, very large and centred, changing about 15 times a second.
- **Landing:** the changes slow over 3.5 s and stop on the winner. This step is decided by `landsAt`, so every TV lands at the same moment.
- **Landed:** the winner's name grows, a celebration plays (spec 14), and the TV shows "Winner!".
- **Reduced motion:** no flipping; "Drawing…", then the winner.
- **Signed-in TV:** the host bar adds Start / Stop, Claimed and Not here on the raffle screen.

## Edge cases

- **Upload errors:** a file that isn't CSV, has no names or is too big is refused with one plain message, and the list is unchanged.
- **Same name twice in the file:** two guests in the same family with the same name merge into one.
- **Stop while nobody's left:** if the only ticket holders were checked out between Start and Stop, Stop goes back to idle with "Nobody left to draw."
- **Winner checked out before Claimed:** Claimed still uses up their ticket.
- **Removing a guest during a draw:**
  - Before Stop, they're simply no longer in the draw.
  - After Stop, the landed winner stays on screen, and Claimed and Not here still work.
- **Refresh mid-draw:** a TV or Controls that reloads during landing picks up from `landsAt` and lands at the same time as the rest.
- **Ending the event (spec 07):** the raffle stays available.
- **Raffle and phones:** phones never see the raffle; the live banner (spec 24) only shows for showdowns.

## Acceptance criteria

- [ ] AC-1: Uploading a CSV of one column adds each row as a guest with no family; two columns add family then name; a recognized header row is skipped; quoted fields, blank rows, empty families and names over 60 characters are handled as in Behavior 2.
- [ ] AC-2: Uploading again merges: matching guests (family and name, ignoring case, accents and spaces) keep their check-in, tickets and wins; new ones are added unchecked; missing ones are listed with Remove; the result counts added, kept and missing.
- [ ] AC-3: On the check-in page, Check in all checks in a whole family, each person can be ticked in or out on their own, search filters by name or family, and the header counts who's here.
- [ ] AC-4: Add someone adds a checked-in door guest; a name already on the list checks that guest in instead of adding a copy.
- [ ] AC-5: The check-in page needs the check-in code or an admin session; the check-in code can check in and add but not upload, change tickets, remove, or open Controls; wrong codes are rate-limited; with no `CHECKIN_PASSPHRASE` only the admin can check in.
- [ ] AC-6: Two check-ins sent at once on different members of a family both land.
- [ ] AC-7: A checked-in guest holds 1 + extra − won tickets (never below 0) and an unchecked guest none; Controls sets extra tickets from 0 to 99 and shows tickets and people in the draw.
- [ ] AC-8: Stop draws on the server with a secure random number, each ticket held by a guest not skipped this raffle equally likely; over many seeded draws a 3-ticket guest wins about three times as often as a 1-ticket guest; the shown names don't affect the pick.
- [ ] AC-9: Start flips names on the TV; Stop sets the winner and `landsAt` 3.5 s later; every TV and Controls lands on the winner at `landsAt`; reduced motion shows Drawing…, then the winner.
- [ ] AC-10: Claimed uses up one of the winner's tickets and ends the raffle; Not here skips that guest for the rest of this raffle only and starts flipping again; the next raffle starts with nobody skipped.
- [ ] AC-11: Start is refused with plain messages when no tickets are left or a showdown is running; each step carries its draw, so a repeated Stop or Claimed does nothing.
- [ ] AC-12: The TV switches to the Raffle screen from Controls or the host bar, and Start switches it there; on a signed-in TV space or a click starts and stops but never claims; Claimed and Not here are host-bar buttons; a TV not signed in only shows.
- [ ] AC-13: The TV's flip names never include skipped guests or guests with no tickets, and phones never see the raffle.
- [ ] AC-14: The check-in page, the Guests card and the TV raffle screen pass the layout sweep (375 px phone, tablet, 1920 and 1280 TV) with no page-level sideways scroll.

## Tests

- **Unit:**
  - CSV parsing and header detection (AC-1).
  - Merge and keys (AC-2).
  - Tickets (AC-7).
  - The draw with a seeded random source, as a weighted-fairness check over 30,000 draws (AC-8).
  - The raffle step machine, with stale `drawId`s (AC-10, AC-11).
  - Guest service with the memory repo: check in, add, concurrent ticks, roles (AC-3 to AC-6).
- **Component:**
  - Check-in page: family Check in all, tick, search, add (AC-3, AC-4).
  - Guests card: upload result, tickets (AC-2, AC-7).
  - TV raffle: flipping, landing at `landsAt`, reduced motion, keyboard and click on a signed-in TV, no keys when not signed in (AC-9, AC-12).
- **E2E (`e2e/raffle.spec.ts`):** upload a CSV in Controls; check in a family and add a walk-in on a phone; run two raffles on the TV with space, Claimed and Not here; the second raffle doesn't draw the claimed ticket (AC-1 to AC-4, AC-9, AC-10, AC-12).
- **Layout sweep:** add the check-in page and the raffle screen (AC-14).

## Out of scope

- A spinning-wheel mode (Khai, 2026-11-25: flip mode only).
- Exchanging game points for tickets, or paying for tickets in the app. Later, in its own spec.
- Named prizes and a winners list (Khai, 2026-11-25: nothing kept).
- Linking guests to phone players.
- Printing badges or the list.

## Open questions

Answered: A71 to A79 in `OPEN_QUESTIONS.md`. Points for tickets: Q47.
