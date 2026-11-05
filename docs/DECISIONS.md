# Architecture decisions

Each decision is an ADR. To change one, add a new ADR that supersedes it.

---

## ADR-001: Same stack as Wushu Toolkit

**Status:** accepted

**Decision:** Next.js App Router, TypeScript `strict`, Tailwind CSS v4,
deployed on Vercel Hobby. Firebase for auth and data.

Khai already runs this stack, so there is one set of tools to know. Vercel
Hobby is free but non-commercial; a private party is fine. Revisit if Game
Master is ever paid for.

---

## ADR-002: Free to run, Firebase Spark plan, no Cloud Functions

**Status:** accepted

**Decision:** stay on Firebase Spark (free). Cloud Functions need the Blaze
plan, so all trusted server logic (scoring, awards, admin actions) runs in
Next.js route handlers with `firebase-admin`.

Any change that could push usage past free limits must update
`reference/free-tier-budget.md` first.

---

## ADR-003: Event definitions are files in the repo

**Status:** accepted

**Decision:** each event is `content/events/<slug>.ts`: name, dates, theme,
join policy, teams to start with, and its games with their content (word
lists, Jeopardy boards). Runtime state (players, points, sessions) lives in
Firebase, keyed by slug.

Files are versioned, reviewable and easy for AI to write. Adding an event
means a commit and a deploy, which is fine for a few events a year. An
in-app editor is a later backlog item.

---

## ADR-004: Firestore for records, Realtime Database for live state

**Status:** accepted

**Decision:** Firestore holds durable records: players, teams, the points
ledger, game results. Realtime Database holds fast-changing shared state:
presence, live sessions, buzzes, and the leaderboard summary.

- Realtime Database's `onDisconnect` gives accurate presence for free.
- Its server timestamps make buzz order fair regardless of phone clocks.
- Its free plan bills by bandwidth, not per read, so 50 screens watching a
  leaderboard that changes hundreds of times stays far under the limit.
  The same pattern on Firestore would use up the 50k reads a day.
- Cost: two databases and two sets of security rules.

---

## ADR-005: Players are anonymous; admin uses a shared passphrase

**Status:** accepted

**Decision:**
- Players sign in with Firebase Anonymous Auth. The uid is their device
  identity. They pick a nickname per event. No emails or passwords.
- The admin enters a passphrase (env `ADMIN_PASSPHRASE`). A route handler
  checks it and returns a Firebase custom token with the claim
  `admin: true`. Rules and route handlers trust that claim.

The admin login is a convenience gate, not strong security, by Khai's
choice. Rate-limit the sign-in route and keep the passphrase out of the repo.

---

## ADR-006: Points only come from the server and the ledger

**Status:** accepted

**Decision:** clients can never write points. Every award is an
append-only ledger entry written by a route handler (solo game results) or
an admin action (live sessions, manual awards). Totals and the leaderboard
summary are derived from the ledger and can be rebuilt from it. Mistakes
are fixed by voiding, never by deleting.

---

## ADR-007: Game logic, content and look are separate

**Status:** accepted

**Decision:** each game type has pure logic (`logic.ts`), a content shape
(`content.ts`) and a renderer (`Renderer.tsx`). Renderers read semantic
theme tokens and icon names only. A seasonal version of a game is a theme
variant, not new code. Scored solo games run their logic on the server, so
answers never reach the client.

---

## ADR-008: Photos go to Vercel Blob, records to Firestore

**Status:** accepted

Some games ask players to take pictures, and photos are kept for an event
recap and the library.

Cloud Storage for Firebase now requires the Blaze plan, which breaks
ADR-002. Vercel Blob is free on Hobby (1 GB stored, 10 GB transfer and
2,000 uploads a month at the time of writing) and lives on the platform we
already deploy to.

**Decision:**
- Photo files go to Vercel Blob under `events/{slug}/photos/{photoId}.jpg`.
- Each photo has a Firestore record (`events/{slug}/photos/{photoId}`) with
  its owner, game, status and blob URL. The record is the source of truth;
  a blob without a record is garbage.
- Phones shrink and re-encode photos before upload (longest side 1600 px,
  JPEG about 300 KB). Re-encoding also strips location data.
- Phones upload directly to Blob with a short-lived token from a route
  handler that checks the player, game, file type and size. Files never
  pass through our function.
- Photos are `pending` until the admin approves them. Only approved photos
  show on the display, in recaps or to other players.
- Over the free limit, Vercel blocks Blob for 30 days rather than charging.
  The budget doc tracks this; old events can be exported and pruned.

---

## ADR-009: A device can hold several players

**Status:** accepted. Refines ADR-005.

A parent may play, then hand the phone to their kids. Each needs their own
points and plays.

**Decision:** the anonymous uid identifies a **device**. A **player** is a
separate record (`players/{playerId}` with `deviceUid`). A device can create
up to `maxPlayersPerDevice` players per event (default 4). Route handlers
check that the calling device owns the player it acts for. "Score once per
game" applies per player.

---

## ADR-010: Moderation never depends on constant watching

**Status:** accepted

The admin can approve people at the start, but not all night as late
joiners arrive.

**Decision:**
- Default join policy is `open`: join instantly with the event's join code
  and a nickname that passes the name filter. Failing names are rejected
  on the spot. `approval` stays available for small events; `generated`
  nicknames are available for kid-heavy events.
- Admin can rename, remove or ban a device at any time; Controls shows
  what is new since the admin last looked.
- Photos are saved as `pending` and only reach other people at moments the
  admin starts (votes, slideshow). The admin triages in a batch just
  before, with a swipe deck. Only approved photos are ever sent to clients.
- Automatic image screening (an AI check) is a later option; it costs
  money, so it needs Khai's go-ahead.

---

## ADR-011: Individual and team phases, with donations

**Status:** accepted

**Decision:**
- Event `scoring` is `individual`, `team` or `both`. With `both`, the event
  has a runtime `phase` the admin switches from `individual` to `team`.
- Captains are players the admin promotes. A captain names the team and is
  its buzzer in live sessions.
- Players join a team in one tap and cannot switch; the admin can move them.
- Team score = members' points + donations to the team + team awards.
- Donations are ledger transfers from a player to a team, any amount up to
  the player's total, to any team.

---

## ADR-012: Clear photos between events

**Status:** accepted

**Decision:** after each event, export its photos (zip) to a backup, check
the count, then delete the files from Vercel Blob. Firestore records stay,
marked `archived` with where the backup is, so the library keeps its
history. The steps live in `runbooks/event-checklist.md`, which is checked
before every event.
