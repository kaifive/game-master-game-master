# Architecture

Game Master is one Next.js app with three surfaces, backed by Firebase and
Vercel Blob on free tiers. Status: **accepted** (2026-11-05).

## Surfaces

| Surface | Who | Device | Purpose |
|---------|-----|--------|---------|
| **Player client** | Players | Their phone (can be shared, e.g. parent and kids) | Join, play solo games, join or donate to a team, buzz in live games, take photos, vote |
| **Controls** | Admin (Khai, or a helper with the passphrase) | Laptop, tablet or phone | Run the event: phases, teams, live sessions, judging, points, photo triage, moderation |
| **Display** | The room | TV or projector | Leaderboard, join QR code, Jeopardy board, buzz order, photo slideshow. Read-only. |

Controls and Display are separate pages so the TV never shows admin buttons.

## URLs

```
/                               library: every event, past and upcoming (admin)
/admin                          admin sign-in
/admin/[event]                  controls for one event
/admin/[event]/photos           photo triage (swipe to approve or hide)
/admin/[event]/recap            recap: standings and approved photos (admin only)
/[event]                        player hub: join, switch player, games, team, my points
/[event]/play/[game]            a solo game
/[event]/live                   player view of the current live session (buzzer)
/[event]/vote/[game]            vote on approved photos
/[event]/display                big-screen display
/join?code=ABCDE                enter or scan any code; finds its event and game
```

Any page accepts `?code=` so a QR code can carry a code straight in. See
"Codes" below.

- `[event]` is the event's slug, such as `holiday-2026`. Short on purpose so
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
        │    plays, photo records, votes          │
        │  Realtime DB: live, fast-changing state │
        │    presence, live session, buzzes,      │
        │    leaderboard summary                  │
        │  Anonymous Auth: one uid per device     │
        └─────────────────────────────────────────┘
                ▲                       ▲
   moves, joins │ (route handlers,      │ admin actions
   donations    │  firebase-admin)      │ (admin claim)
                │                       │
        ┌───────┴───────────────────────┴─────────┐
        │   Next.js on Vercel                     │
        │   pages + /api route handlers           │
        │   event config from content/events/     │
        └─────────────────────────────────────────┘
                ▲                       ▲
   photo upload │ (direct, one-time     │
                │  token from /api)     │  Controls (admin)
                ▼
        ┌─────────────────────────────────────────┐
        │  Vercel Blob: photo files               │
        └─────────────────────────────────────────┘
```

## Where things live

| Kind of data | Where | Why |
|--------------|-------|-----|
| Event definitions: name, dates, theme, scoring mode, games and their content | `content/events/<slug>.ts` in the repo | Versioned, reviewable, easy for AI to author. ADR-003. |
| Players, teams | Firestore | Durable, queryable |
| Points ledger (awards, donations, voids) and totals | Firestore | Durable audit trail; totals are recomputable |
| Solo game plays and results | Firestore | One scored result per player per game |
| Photo records, votes | Firestore | Queryable for triage, voting and the recap |
| Photo files | Vercel Blob | Free on Hobby; Firebase Storage needs Blaze. ADR-008. |
| Presence (who is online) | Realtime Database | `onDisconnect` makes presence free and accurate |
| Live session state (round, buzzes) | Realtime Database | Low latency, server timestamps, cheap fan-out |
| Leaderboard summary | Realtime Database | Every screen listens; bills by bandwidth, not per read |

## Players and devices

Players never create accounts. The phone signs in with Firebase Anonymous
Auth, which gives the **device** a lasting uid. A device can hold several
**players** in one event, so a parent and kids can share a phone: each has
their own nickname, points and plays, and the hub has a "switch player"
button. ADR-009.

## Moderation without watching

The admin can't watch the door or the photo feed all night, so nothing
depends on constant monitoring. ADR-010.

**Names**
1. Players join instantly. No lobby by default (`open` policy).
2. A name filter checks every nickname and team name when it is typed.
   Names that fail are rejected on the spot with "pick another name".
3. Joining needs the event's join code, which is on the QR poster and the
   display, so people who aren't in the room can't join.
4. The admin can rename, remove or ban a device at any time. Controls
   shows "new since you last looked", so catching up takes seconds.
5. The `approval` policy (a lobby) still exists for small events.

**Photos**
1. Every photo is saved, and starts `pending`.
2. A photo only reaches other people at a moment the admin starts: a photo
   vote, or the display slideshow. Until then, nobody else sees it.
3. Just before such a moment, the admin triages in a batch: a swipe deck,
   right to approve, left to hide. About a second per photo.
4. Only approved photos are ever sent to players or the display.
5. A helper can triage on their own phone with the shared passphrase.

**Fair play**
1. Each player scores each solo game once.
2. A device can hold up to 4 players per event (set per event). Controls
   groups players by device, so a phone with many players stands out.
3. Points only come from the server (ADR-006).
4. The admin can remove a player, merge two players, or void points.

## Codes

Events are meant to be configured per occasion, and codes are one of the
main dials. ADR-020.

- **Event code:** joins the event (ADR-010).
- **Game code:** optional, per game. What it does is set per game:
  - `open`: the game is listed for everyone; the code is a shortcut that
    jumps straight to it (a QR code at a station, the TV during Jeopardy).
  - `unlock`: the game is hidden or locked until a code is entered. Unlocks
    can count for that player only (a scavenger hunt: each player must find
    the code) or for the whole event (the host reveals it on the TV).
- **Quick games:** an event with a single game. Its code opens the game
  directly, so a pickup game needs no event setup beyond one small file.
- A code can arrive three ways: typed on `/join`, typed in the hub's
  "Enter a code" box, or in the URL as `?code=` from a QR code. A code in
  the URL survives the join flow, so a new player lands in the right game
  after picking a name.
- Codes are 5 characters from an alphabet without look-alikes (no 0/O,
  1/I/L), case-insensitive. Codes are checked by the server only; the list
  of codes never reaches a phone, so a scavenger code can't be read from
  the page. Attempts are rate-limited per device.

## Points, phases and teams

An event is individual only, teams only, or both (`scoring` in the event
file). For both, the admin moves the event from the **individual phase**
to the **team phase** in Controls. ADR-011.

- **Individual phase.** Players earn points for themselves.
- **Team phase.** The admin promotes players to **captains** (team
  leaders). Each captain names their team (through the name filter).
  Other players join a team from a list in one tap.
- **No switching.** Once on a team, a player can't change it. The admin can
  move them.
- **Team score** = the members' points + points donated to the team +
  team awards (live sessions, team photo challenges).
- **Donations.** Any player can give some or all of their points to any
  team, with or without joining it. A donation moves points: the player's
  total goes down, the team's goes up.
- Both leaderboards exist. The display shows the one that fits the phase.

## The kinds of play

### Solo games

1. Player opens `/[event]/play/[game]`.
2. The client renders the game from its **game type** and **theme**.
3. Each move goes to a route handler, which runs the game logic on the
   server. The answer never reaches the client.
4. When the game ends, the server writes the **result** and a **ledger**
   entry, then updates the leaderboard summary.
5. A player scores each game once. Replays are practice and earn nothing.

### Live sessions

1. Admin starts a **live session** (for example a Jeopardy board) from
   Controls. Its state lives in Realtime Database.
2. Each team's **captain** gets the buzzer on their phone. Only captains
   control live games, so teams of different sizes, or with members
   sharing phones, are on equal footing. Other members watch the clue on
   their phones and the display. ADR-014.
3. Admin opens a **round**. Captains buzz. Each buzz is stamped with the
   database server's time, so order is fair regardless of phone clocks.
4. Controls and Display show the buzz order. Admin marks the first buzz
   right or wrong. Right awards points to the team; wrong passes to the
   next buzz or reopens the round.
5. Awards go through the same ledger as solo games.

### Photo challenges and votes

1. A photo challenge game lists prompts ("selfie with your sifu"), for
   players or for teams (the captain submits for the team).
2. The phone shrinks the photo to 1600 px JPEG (which strips location
   data), gets a one-time upload token from the server, and uploads
   straight to Vercel Blob. The server writes the record as `pending`.
3. Points for submitting are awarded when the admin approves.
4. The admin can open a **photo vote** on a prompt: approved photos go out
   to every player, who vote for the best (not their own or their team's).
   The winner gets bonus points.
5. All photos stay saved. After the event they are backed up and cleared
   from Blob (see `runbooks/event-checklist.md`).

## Game engine

Every game type is split into parts that never mix:

```
lib/games/<type>/
  logic.ts       pure functions: create, applyMove, isOver, score. No React, no I/O.
  content.ts     the shape of its content (word list, board) and validation
  Renderer.tsx   player view. Reads theme tokens only; never hard-codes colors or icons.
  Display.tsx    optional TV view (Jeopardy board, live results). Same tokens, display scale.
```

- **Logic** is pure, so it runs on the server for scoring and can be unit
  tested without a browser.
- **Renderer** and **Display** can be upgraded or swapped without touching logic.
- **Style pack** supplies tokens, fonts, slot skins, icons and motion
  presets, to phones and the TV alike. Each event picks its own pack; a
  holiday variant sits on top of it. The admin layer has one fixed,
  standard look. See spec 09 and ADR-021.

A **game** (an instance) in an event config is: a game type + its content +
an optional theme variant + scoring settings.

## Admin access

One shared passphrase (env var `ADMIN_PASSPHRASE`). Signing in at `/admin`
sends it to a route handler, which returns a Firebase custom token with an
`admin: true` claim. Security rules and route handlers check that claim. It
is meant for convenience, not strong security, and can be shared with a
helper. See ADR-005.

## Scale and cost

Target: up to 100 players at once, on free tiers. The Realtime Database
free plan allows 100 simultaneous connections. Connections count per
device, not per player, so shared phones help. Past about 90 devices,
player phones connect to Realtime Database only on the live page. See
`reference/free-tier-budget.md`.

## Code layout (planned)

```
app/
  page.tsx                   library
  admin/                     sign-in, controls, photo triage, recap
  [event]/                   player hub, play/, live/, vote/, display/
  api/                       route handlers (join, move, donate, photos, admin)
components/
  slots/                     slot defaults, contract suites, registry (useSlots)
  theme/                     StyleRoot (event pages), AdminRoot (admin pages)
  motion/                    glides, count-ups, bar race, bursts, toast chain, stage, confetti
  packs/<pack>/              a style pack's own slot components; loaded only via packs/loaders.ts
  ui/                        shared primitives that aren't slots
  player/ controls/ display/ per-surface components
content/events/              one config file per event
lib/
  events/                    event config types and registry
  games/<type>/              logic, content, renderer per game type
  themes/                    style packs: tokens, skins, icons, motion presets, variants;
                             plus the fixed admin theme
  players/                   join, devices, name filter
  codes/                     code generation, lookup, unlocks
  points/                    ledger, donations, totals
  teams/                     captains, joining
  live/                      live session state machine
  motion/                    moment lanes and queues, count-up and FLIP math
  photos/                    resize, upload, records, triage, votes
  firebase/                  config (env), client (browser), admin (server-only), paths
scripts/                     export photos, prune event, load test
tests/                       node:test unit tests
docs/
```
