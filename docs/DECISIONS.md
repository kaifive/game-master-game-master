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

---

## ADR-013: Nicknames are a plain text box

**Status:** accepted. Supersedes the generated-names option in ADR-010.

**Decision:** players type their own name. The name filter, kick, rename
and ban from ADR-010 still apply. There is no generated-names mode.

---

## ADR-014: Only captains control live games

**Status:** accepted

Teams have different sizes, and some members share a phone, so "every
phone is a buzzer" would favor big teams.

**Decision:** in live sessions only each team's captain has controls
(buzzer, answers). Every other player sees the current clue and their
team's status. The admin can change a team's captain at any time, for
example if the captain's phone dies.

---

## ADR-015: Test-driven, with tests at three levels

**Status:** accepted. Replaces the `node:test` choice from the first
testing convention.

**Decision:**
- **Vitest** for unit and component tests (with Testing Library and
  jsdom), and V8 coverage with enforced thresholds.
- **Firebase Emulator Suite** for security rules and repository contract
  tests (`@firebase/rules-unit-testing`).
- **Playwright** for end-to-end tests. One test can open many browsers at
  once, so "three captains buzz, admin judges, display updates" is a
  single test.
- Work is test-first: acceptance criteria → failing tests → code →
  refactor. Every acceptance criterion has a test that names it.
- `npm run verify` runs every gate and must pass before a commit lands
  on `main`. CI runs it on every pull request.

Vitest replaces `node:test` because component tests need a DOM and a
mature React testing setup.

---

## ADR-016: Feature modules with layers, shared schemas, thin routes

**Status:** accepted. Replaces "hand-written parsers" in the first code
convention.

**Decision:**
- Code is grouped by feature (`lib/points`, `lib/teams`, ...). Each module
  has the same layers: model (types and schemas), rules (pure logic),
  repo (interface plus Firebase and in-memory versions), service (server
  use cases), client (hooks), and one public `index.ts`.
- **Zod** schemas in `model.ts` define every shape that crosses a boundary.
  Types are inferred from them, and the client and server share the same
  schema, so a shape is written once.
- Services depend on repository interfaces, never on Firebase directly.
  Unit tests use the in-memory repos; contract tests run the same suite
  against both versions so they can't drift apart.
- Every route handler is built with one `defineRoute()` helper that does
  auth, body validation, rate limiting and error mapping. Route files
  only call a service.
- Import boundaries are enforced by ESLint, not by memory.

---

## ADR-017: Design with Impeccable; PRODUCT.md and DESIGN.md at the root

**Status:** accepted

Khai wants a fun look that doesn't read as generic AI output.

**Decision:**
- Vendor the open-source **Impeccable** skill (Apache 2.0, by Paul Bakaus)
  into `.claude/skills/impeccable`, with its agents in `.claude/agents`.
  Upstream commit in `.claude/skills/impeccable/UPSTREAM`. Every session
  gets its commands: `shape`, `critique`, `audit`, `polish`, `delight`, ...
- `PRODUCT.md` (product truth) and `DESIGN.md` (the chosen visual system)
  live at the repo root, where Impeccable reads them.
- Its checker is a downloaded binary. It is **not** run automatically
  (no hooks) until Khai approves running it. Without it, the skill reads
  `PRODUCT.md` and `DESIGN.md` directly.
- **Taste Skill** was considered and not adopted: it targets marketing
  websites built around real photography and is about 40 MB with assets.

Updating Impeccable: copy `plugin/skills/impeccable` from upstream over the
folder, update `UPSTREAM`, review the diff.

---

## ADR-018: Motion system with shared primitives; canvas-confetti allowed

**Status:** accepted

Khai wants smooth leaderboard transitions and confetti when games finish.

**Decision:**
- One motion system: tokens for durations and easings, and shared
  primitives in `lib/motion` and `components/motion` (spec 14). No
  component animates on its own terms.
- Built on CSS transitions and the Web Animations API (FLIP for
  reordering). No general animation library such as Framer Motion; it is
  large for phones and the primitives cover our needs.
- One exception: **canvas-confetti** (about 6 KB gzipped, handles reduced
  motion, no dependencies), loaded only when a celebration fires.
- The server writes **moments** to `moments/{slug}` in Realtime Database
  so the display can celebrate things as they happen.
- Every primitive has a reduced-motion fallback and a test for it.

---

## ADR-019: Impeccable checker turned on

**Status:** accepted. Supersedes the "not run automatically" part of ADR-017.

Khai approved running Impeccable's checker. `.claude/settings.json` (copied
from `docs/setup/claude-settings.json`) allows the launcher and runs its
hook at session start, after every edit and at the end of each turn. The
hook is silent for non-UI files.

---

## ADR-020: Codes for events and games, carried in the URL

**Status:** accepted

Khai wants the platform highly configurable per event: QR codes that jump
straight into a game, scavenger-hunt codes that unlock games, and quick
single-game sessions.

**Decision:**
- Every event has a join code. Any game may also have codes, each with an
  action: `open` (jump to a listed game) or `unlock` (reveal a hidden or
  locked game), and for `unlock` a scope: `player` or `event`.
- A quick game is an event with one game, not a separate concept.
- Codes are accepted from `/join`, the hub's code box, or `?code=` on any
  URL. The code in the URL is kept through the join flow.
- Codes live in the event config (server-only) or are generated into
  Firestore; a global index maps code to event and game. Codes are never
  sent to clients; only the server resolves them. Resolution is
  rate-limited per device.
- Format: 5 characters, unambiguous alphabet, case-insensitive, unique
  across live events.

---

## ADR-021: Each event picks a style pack; the admin layer is standard

**Status:** accepted. Refines ADR-007 and ADR-017: there is no single
platform look for players.

Khai wants each event to have its own design style, chosen for that event,
with standard SaaS-style admin screens and the TV matching the phones.

**Decision:**
- The player client and TV display use the event's **style pack**: tokens,
  fonts, skins for a fixed list of slots, icons, motion presets and
  decorations, in light and dark, with variants such as `holiday` on top.
- The admin layer (library, sign-in, controls, triage, recap) uses one
  fixed, standard, calm look for every event.
- Components and game renderers are written once against the slots and
  semantic tokens. A pack changes appearance only, never DOM or behavior,
  so adding a pack never touches game code.
- Each pack's CSS and fonts load only for events that use it.
- Color mode defaults from the event file and can be switched live from
  Controls (`live/{slug}/settings`), for phones and TV together.
- v1 builds the admin look and one pack, chosen for the holiday party.
  The design options already shown (Sticker Book, Tile Rack, One-Hour
  Photo, Memphis Party) are candidates for later packs.

---

## ADR-022: Generic component slots, resolved per pack with defaults

**Status:** accepted. Supersedes the "same DOM in every pack" rule in
ADR-021; the rest of ADR-021 stands.

Khai's model: components have generic names, each event's style supplies
its own versions, and games use the event's component or the default.

**Decision:**
- Games and pages use **slots** (`ScoreCard`, `Tile`, `Toast`, ...) through
  a registry (`useSlots()`), never a styled component directly.
- Each slot has one props contract, one default component styled only by
  tokens, and one contract test suite.
- A style pack may provide its own component for any slot; the registry
  returns it, or the default when the pack has none.
- Every override must pass the slot's contract suite (props, roles,
  states, keyboard, reduced motion), so a pack can change how a slot looks
  and moves but never what it means or does.
- Pack components load only for events that use the pack.

Packs get full freedom where CSS isn't enough (a score card on a real
handle), and the contract suites stop that freedom from breaking games.

---

## ADR-023: Public Firebase config is committed; secrets live in Vercel

**Status:** accepted

**Decision:**
- The Firebase web config (`NEXT_PUBLIC_FIREBASE_*`) is committed in
  `.env.production`. These values ship to every phone anyway; committing
  them means previews and production build without manual setup.
- Local development uses `.env.development`, which points the app at the
  emulators and the `demo-game-master` project, never production.
- Secrets (`FIREBASE_SERVICE_ACCOUNT`, `ADMIN_PASSPHRASE`,
  `BLOB_READ_WRITE_TOKEN`) are only ever set in Vercel or `.env.local`
  (ignored by git). Errors about them name the variable, never the value.
- Real protection comes from security rules and server-side checks, not
  from hiding the web config.
