# Architecture

Game Master is one Next.js app with three surfaces, backed by Firebase on the
free tier. Status: **draft for review**.

## Surfaces

| Surface | Who | Device | Purpose |
|---------|-----|--------|---------|
| **Player client** | Players | Their phone | Join, pick a team, play solo games, buzz in live games, see own points |
| **Controls** | Admin (Khai) | Laptop or tablet | Run the event: approve players, manage teams, run live sessions, judge buzzes, award points |
| **Display** | The room | TV or projector | Leaderboard, join QR code, Jeopardy board, buzz order. Read-only. |

Controls and Display are separate pages so the TV never shows admin buttons.

## URLs

```
/                               library: every event, past and upcoming (admin)
/admin                          admin sign-in
/admin/[event]                  controls for one event
/[event]                        player hub: join, team, game list, my points
/[event]/play/[game]            a solo mini game
/[event]/live                   player view of the current live session (buzzer)
/[event]/display                big-screen display
```

- `[event]` is the event's slug, such as `winter-2026`. Short on purpose so
  it fits a QR code and can be typed.
- Slugs that clash with routes (`admin`, `api`, `_next`) are reserved.
- Games are children of an event, so the library keeps every event's games
  and results for good.

## System diagram

```
 Player phones ─┐                       ┌─ Display (TV)
                │   reads + listens     │   reads + listens
                ▼                       ▼
        ┌─────────────────────────────────────────┐
        │                Firebase                 │
        │  Firestore: durable records             │
        │    events, players, teams, ledger,      │
        │    game results                         │
        │  Realtime DB: live, fast-changing state │
        │    presence, live session, buzzes,      │
        │    leaderboard summary                  │
        │  Anonymous Auth: one uid per device     │
        └─────────────────────────────────────────┘
                ▲
   photo upload │ (direct, with a token from /api)
                ▼
        ┌─────────────────────────────────────────┐
        │  Vercel Blob: photo files               │
        └─────────────────────────────────────────┘
                ▲                       ▲
   scored moves │ (route handlers,      │ admin writes
   join, awards │  firebase-admin)      │ (admin claim)
                │                       │
        ┌───────┴───────────────────────┴─────────┐
        │   Next.js on Vercel                     │
        │   pages + /api route handlers           │
        │   event config from content/events/     │
        └─────────────────────────────────────────┘
                                ▲
                                │
                        Controls (admin)
```

## Where things live

| Kind of data | Where | Why |
|--------------|-------|-----|
| Event definitions: name, dates, theme, which games, game content (word lists, Jeopardy boards) | `content/events/<slug>.ts` in the repo | Versioned, reviewable, easy for AI to author. No admin editor needed for v1. See ADR-003. |
| Players, teams, approvals | Firestore | Durable, queryable |
| Points ledger (every award) and totals | Firestore | Durable audit trail; totals are recomputable |
| Solo game progress and results | Firestore | Durable; one result per player per game |
| Presence (who is online) | Realtime Database | `onDisconnect` makes presence free and accurate |
| Live session state (current round, open or locked, buzzes) | Realtime Database | Low latency, server timestamps, cheap fan-out |
| Leaderboard summary | Realtime Database | Every screen listens; RTDB bills by bandwidth, not per read. See the budget doc. |
| Photo files | Vercel Blob | Free on Hobby; Firebase Storage needs Blaze. See ADR-008. |
| Photo records: owner, game, approval status, blob URL | Firestore | Queryable for moderation and recaps |

## Photos

Some games ask players to take a picture (for example a photo challenge:
"a selfie with your sifu"). Photos also feed an event recap that stays in
the library.

1. The phone takes or picks a photo, shrinks it to 1600 px and re-encodes
   it as JPEG (which strips location data).
2. It asks `/api/[event]/photos/upload` for a one-time upload token. The
   route checks the player is approved, the game accepts photos, and the
   type and size are allowed.
3. The phone uploads straight to Vercel Blob, then the server writes the
   photo record as `pending`.
4. The admin approves or hides photos in Controls. Points for a photo
   challenge are awarded on approval.
5. Approved photos appear on the display slideshow and the event recap.

See spec 13.

## The two kinds of play

### Solo mini games (async)

1. Player opens `/[event]/play/[game]`.
2. The client renders the game from its **game type** and **theme**.
3. Each move goes to a route handler, which runs the game logic on the
   server. The answer never reaches the client.
4. When the game ends, the server writes the **result** and a **ledger**
   entry, then updates the leaderboard summary.
5. A player scores each game once. Replays are practice and earn nothing.

### Live sessions (sync)

1. Admin starts a **live session** (for example a Jeopardy board) from
   Controls. Its state lives in Realtime Database.
2. Admin promotes one **captain** per team. Captains' phones show the buzzer.
3. Admin opens a **round**. Captains buzz. Each buzz is stamped with the
   database server's time, so order is fair regardless of phone clocks.
4. Controls and Display show the buzz order. Admin marks the first buzz
   right or wrong. Right awards points to the team; wrong passes to the
   next buzz or reopens the round.
5. Awards go through the same ledger as solo games.

## Game engine

Every game type is split into parts that never mix:

```
lib/games/<type>/
  logic.ts       pure functions: create, applyMove, isOver, score. No React, no I/O.
  content.ts     the shape of its content (word list, board) and validation
  Renderer.tsx   React view. Reads theme tokens only; never hard-codes colors or icons.
```

- **Logic** is pure, so it runs on the server for scoring and can be unit
  tested without a browser.
- **Renderer** can be upgraded or swapped without touching logic.
- **Theme** supplies colors, color mode, icon set and decorations through
  CSS variables and an icon map. A holiday variant is a theme, not a code
  change. See spec 09.

A **game** (an instance) in an event config is: a game type + its content +
an optional theme variant + scoring settings.

## Identity and fair play

Players never create accounts. On first visit the client signs in with
Firebase Anonymous Auth, which gives the device a lasting uid. Joining an
event creates a player record for that uid with a nickname.

Duplicate accounts (the same person joining twice to farm points) are
handled in layers. Details in spec 02.

1. **One player per device per event.** The uid is the key.
2. **Join approval.** Each event has a join policy. The default for the
   holiday party is `approval`: new players wait in a lobby until the admin
   taps approve, so two "Khai"s are easy to spot.
3. **Score once.** Each solo game pays out once per player, so a second
   account gains at most one more payout per game, and only if approved.
4. **Server-side scoring.** Points only come from route handlers and admin
   actions. Security rules block clients from writing points.
5. **Admin tools.** Remove a player, merge two players, or void a ledger
   entry. Totals are recomputed from the ledger.

## Admin access

One shared passphrase (env var `ADMIN_PASSPHRASE`). Signing in at `/admin`
sends it to a route handler, which returns a Firebase custom token with an
`admin: true` claim. Security rules and route handlers check that claim. It
is meant for convenience, not strong security. See ADR-005.

## Scale and cost

Target: 50 players, up to 100 in total, on free tiers. The Realtime
Database free plan allows 100 simultaneous connections, which is the hard
ceiling. See `reference/free-tier-budget.md` for the math and what to change
past 90 people.

## Code layout (planned)

```
app/
  page.tsx                   library
  admin/                     sign-in and controls
  [event]/                   player hub, play/, live/, display/
  api/                       route handlers (join, move, award, admin)
components/
  ui/                        shared primitives
  player/ controls/ display/ per-surface components
content/events/              one config file per event
lib/
  events/                    event config types and registry
  games/<type>/              logic, content, renderer per game type
  themes/                    theme tokens, variants, icon sets
  points/                    ledger and totals
  live/                      live session state machine
  photos/                    resize, upload, records, moderation
  firebase/                  client and admin setup
tests/                       node:test unit tests
docs/
```
