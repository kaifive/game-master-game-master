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

**Status:** superseded by ADR-027. Refined ADR-005.

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

---

## ADR-024: Events start and end by hand

**Status:** accepted; the "schedule shown" part is superseded by ADR-026.

Khai doesn't want the clock deciding when games open or close.

**Decision:** an event's status is `upcoming` until the admin presses
Start, `live` until the admin presses End, then `ended`. It is stored in
`events/{slug}.status`; with nothing stored, the event is `upcoming`. The
event file's schedule is shown to players ("Saturday, Dec 19 · 4:30 PM
EST") and never changes the status.

---

## ADR-025: Server dependencies must load without require(esm)

**Status:** accepted

Production crashed on every server-rendered page: `firebase-admin/auth`
loads `jwks-rsa`, which `require()`s `jose` 6, an ES-module-only package.
Vercel's Node runtime can't `require()` ES modules, though local Node 22 can.

**Decision:**
- `package.json` `overrides` pins `jose` 5.10.0 (which still ships
  CommonJS) under `jwks-rsa`. `jwks-rsa` only uses `importJWK` and
  `exportSPKI`, which are the same in 5 and 6.
- `lib/firebase/admin-load.test.ts` loads each `firebase-admin` entry point
  with `--no-experimental-require-module`, so a dependency bump that brings
  the problem back fails CI.
- Remove the override once Vercel's runtime supports `require(esm)` or
  `jwks-rsa` stops using `require()`; the test says when it's safe.

---

## ADR-026: No dates on events; replay is an event setting

**Status:** accepted. Supersedes the "shown to players" part of ADR-024.

Khai runs everything from the admin dashboard, so dates on screen only
mislead.

**Decision:**
- Event files have no `schedule` or `timeZone`, and no page shows a date or
  time. Before the start, players see "Waiting for the host to start the
  games." Games open and close only when the admin starts and ends the event
  (ADR-024), or before the start for an `alwaysOpen` game.
- Event files are strict: an unknown field (a leftover `schedule`, a typo)
  fails validation.
- Whether games can be played again is one setting for the whole event
  (`replayable`), not per game.

---

## ADR-027: One player per phone; starting over forfeits

**Status:** accepted. Supersedes ADR-009.

Several players per phone made it too easy to make extra players and farm
games that can't be replayed. Khai prefers one player per phone, even though
kids without a phone can't play on their own.

**Decision:**
- A phone (device) has one player per event. There is no Add player or
  Switch player.
- "Start over" replaces the phone's player with a new one. The old player
  is forfeited: off the leaderboard, their points lost (including points
  donated to teams, once spec 04 exists), and their name freed. The phone
  confirms first, and mentions donations only when the event has teams.
- Each event sets `restartsPerDevice` (the party: 1). A phone that has used
  them can't start over again. Joining for the first time needs the join
  code; starting over doesn't.
- Team captains can't start over (spec 03), so a team is never left
  without its captain.

---

## ADR-028: Admin sessions are a signed cookie

**Status:** accepted. Replaces the custom-token part of ADR-005.

Security rules stay deny-all for clients, and every admin action is a
route handler, so nothing needs a Firebase admin claim. A signed cookie is
simpler, works without Firebase (tests, local runs), and can't be read by
page scripts.

**Decision:** `POST /api/admin/session` checks `ADMIN_PASSPHRASE` and sets
`gm_admin`: an expiry and an HMAC-SHA256 signature keyed from the
passphrase. HttpOnly, SameSite=Lax, Secure outside local runs, 7 days.
Changing the passphrase signs everyone out. Sign-in is rate-limited per IP.

## ADR-029: Trivia sends each question's answer, scrambled, for instant feedback

**Status:** accepted. Narrows spec 08's "the phone never sees an answer it hasn't played" for trivia.

A tap took about 0.8 s to show right or wrong, because the phone waited for
the server. Khai chose instant feedback over keeping answers off the phone.

**Decision:**
- Each trivia question's view carries `key`: the right answer's position,
  lightly scrambled. The phone reads it to mark the tapped answer right or
  wrong at once; the server's reply then confirms it.
- The server still checks every answer, applies the deadline and the speed
  scoring, and keeps the score. The phone's verdict is only for show.
- Only the current question's key is sent, never the whole round.
- The trade-off: someone with browser developer tools could read the key
  within the 10 seconds. That's hard on a phone at a family party and
  accepted for now. Other game types keep answers on the server.

---

## ADR-030: Two competitions: individual and team, with donations

**Status:** accepted. Refines ADR-011 (team score no longer includes members' points).

Khai wants a prize for the top player and the top team, and teams that play
like one player on one device.

**Decision:**
- Solo games earn **individual** points on each player's phone. Team games
  (`phase: "team"`) are played on the captain's phone and earn **team**
  points. Neither ever changes the other.
- **Team score** = team awards + donations received. Members' individual
  points don't count toward it, so team size doesn't decide the winner.
- **Donations** move a player's own points to any team, one to one, so
  donating lowers their individual score. That tension is the point: anyone
  out of the running for the individual prize can help a team.
- The individual prize is decided at the **end of the night**, not when the
  team phase starts, so donations always cost something.
- The host sets a **maximum team size**, so bigger teams can't win on
  donations alone. Solo games stay open in the team phase.

## ADR-031: Phones read teams from a Realtime Database summary

**Status:** accepted.

Every phone polls the teams panel every 15 seconds. Building it from
Firestore costs about 60 reads (settings, every team, every player), so 50
phones over a 3-hour party would need about 2 million reads, 40 times the
free limit.

**Decision:** the server writes `teams/{slug}` in the Realtime Database (one
JSON string: phase, maximum team size, and every team with its members)
after every team change: a captain made or changed, a team named, a join or
move, a phase or size change, a player dropped, test data cleared. Polls,
the phone leaderboard, the TV and team games read only that. Controls and
writes still read Firestore, so the checks (room on a team, the phase for
joining) use fresh data.

**Consequences:** a team change costs about 60 Firestore reads once, not
per poll. The summary can't drift for long, since every team write rewrites
it. Team rows on the leaderboard get their name and color from the same
step, so a renamed team shows its new name on the TV at once.


---

## ADR-032: Drawings a game opts into are kept in Vercel Blob as SVG

**Status:** accepted. Builds on ADR-008.

Khai wants to keep the drawings from some games (Quick Draw first), not
every game, so they can be looked at after the run: by the host now, in a
recap or slideshow later (spec 13).

**Decision:**
- A game opts in with `keepDrawings: true` in the event file. Only game
  types that make a drawing may set it (validation refuses it elsewhere);
  today that's `draw`.
- When a run of such a game finishes, the server turns its strokes into a
  small SVG (dark ink on white, a few KB) and puts it in Vercel Blob at
  `events/{slug}/drawings/{gameId}/{playerId}-{run}.svg`, with a random
  suffix so the public URL can't be guessed. The strokes are already on the
  server (the judge scores them), so the phone uploads nothing.
- Each drawing has a Firestore record (`events/{slug}/drawings/{id}`): the
  game, player, run, points and blob URL. As with photos, the record is the
  source of truth.
- Every finished run is kept, not just the best, so a recap can show them
  all. A failed save is logged and never blocks the score.
- Without `BLOB_READ_WRITE_TOKEN` (no Blob store connected) the server keeps
  nothing and Controls says so. The memory backend keeps drawings as data
  URLs, so local runs and tests need no Blob.
- Clearing test data deletes the drawings' records and files.

**Consequences:** one Blob upload and one Firestore write per finished run
of an opted-in game. The party's ~50 players playing Quick Draw a few times
is about 150 uploads (of 2,000 a month) and under 10 MB.

---

## ADR-033: Blob signs in with Vercel's OIDC tokens or a read-write token

**Status:** accepted. Refines ADR-032.

New Vercel Blob stores connect to a project with OIDC: Vercel sets
`BLOB_STORE_ID` and gives each function a short-lived token, and no
`BLOB_READ_WRITE_TOKEN` is created. ADR-032 assumed the token, so the live
site said no Blob store was connected (Khai, 2026-11-10).

**Decision:** a Blob store counts as connected when either
`BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` is set. With the token, the
server passes it to the Blob SDK; without it, the SDK signs in by OIDC on
its own. Photo uploads straight from phones (spec 13) will still need a
read-write token to sign upload tokens, so that spec checks for one.

**Consequences:** nothing long-lived to rotate for drawings. Local runs
still use memory, since there's no OIDC token off Vercel.

---

## ADR-034: Photos upload through our route, shrunk on the phone

**Status:** accepted. Supersedes ADR-008's direct upload; the rest of ADR-008 stands.

ADR-008 had phones upload straight to Blob with a short-lived client token.
Signing those tokens needs a read-write token, and the party's Blob store
connects by OIDC with none (ADR-033).

**Decision:** phones shrink each photo first (longest side 1600 px, JPEG,
about 300 KB), then post it to `POST /api/events/[slug]/games/[gameId]/photo`.
The route checks the player, the game, the type and the size (at most 3 MB),
and puts the file in Blob from the server with a random suffix. Photo
challenges keep each photo's URL and rating in the play (spec 20); spec 13's
photo records can adopt them later.

**Consequences:** each photo passes through one function call (well under
Vercel's 4.5 MB request limit and the Hobby function budget at party
scale), and nothing long-lived signs uploads.

---

## ADR-035: A game library from one catalog; events keep choosing in files

**Status:** accepted (spec 23, Khai 2026-11-15). ADR-003 stands.

Khai wants a list of every game he's built to pick from when planning an
event. He chose a reference list, not an admin builder.

**Decision:** one catalog in code (`lib/games/catalog.ts`): each built game
type's name and one-line pitch. The admin Games page and `docs/GAMES.md` are
both made from it, and tests tie it to the registry and the doc, so neither
drifts. An event's games stay in its event file. A game can be turned fully
`off` there (a third visibility beside `listed` and `hidden`): kept for later,
but not listed and not playable.

**Consequences:** adding a game type means adding its catalog entry (a test
says so) and rerunning `npm run games:doc`. Changing an event's games is still
a code change and a deploy.


---

## ADR-036: Team showdowns: the TV shows the game, the captain's phone is the controller

**Status:** accepted (spec 24, Khai 2026-11-17). Builds on ADR-014 and spec 11.

Khai wants team games where the solo games are practice, teams choose who
plays, and the same people don't play every time, with only the captain's
phone needed.

**Decision:** showdowns run as live sessions (spec 11): the TV carries the
game, each captain's phone is the controller, and the host steps through with
Next in Controls. Each round the captain picks who's up; a rotation per team,
kept in Realtime Database for the whole event, blocks repeats until everyone
has gone. Scoring is per game and goes to teams through the ledger. Timing
that has to be fair to a hundredth (Blind Stop) is measured on the phone, as
in T-Timer, because network lag would swamp it.

**Consequences:** spec 11's engine needs a step machine with host-driven
Next, which showdowns and Jeopardy (spec 12) share. Each showdown type adds a
TV view, a phone controller and a short looping demo.

---

## ADR-037: Live sessions are polled from the server, on a shared server clock

**Status:** accepted (spec 11, 2026-11-17). Narrows ADR-004 for live play.

Showdowns need phones and the TV to follow a game within about a second, and
some (Blind Stop, Last Second) need a round's start to land at the same
moment everywhere. Realtime Database listeners on every phone would do it,
but they count against the 100-connection limit all night and put secret
state where phones can read it.

**Decision:** the server owns each live session, stored at `live/{slug}` in
Realtime Database (in memory in dev), and only route handlers read or write
it. The TV, Controls and phones poll a per-role view about every 700 ms
during a session (4 s otherwise, paused when hidden). Every view carries the
server's time; devices estimate their clock offset from the fastest reply and
run timers against the server clock. Rounds start at a shared server time
about 2 s ahead, so every device has the start before it happens.

**Consequences:** secrets never leave the server early; no phone holds a
database connection. A 30-minute showdown block with 50 phones is about
130,000 small requests, fine on Vercel Hobby, and costs Realtime Database
bandwidth only (well under 1 GB). Timing fairness depends on clock offset
estimates, good to tens of milliseconds on party wifi.

---

## ADR-038: The host tracks who's played; showdowns are their own TV screen

**Status:** accepted (spec 24, Khai 2026-11-17). Supersedes the who's-up picks in ADR-036.

ADR-036 had each captain pick who's up on their phone from the team's joined
players, with the app rotating turns. At the party, not everyone on a team
will have a phone, so the app can't know the whole team.

**Decision:** the app doesn't pick players. Controls has a Who's played list
per team: the team's joined players plus names the host adds by hand, tapped
to mark who has played, in the team's color. It is stored with the live state
at `live/{slug}` and kept for the whole event. The captain's phone stays the
controller, passed to whoever's up. Showdowns get their own TV screen, which
the host switches to and from like the leaderboard; starting a showdown
switches to it. Showdowns support 1 to 10 teams.

**Consequences:** no who's-up step on phones or the TV; a round goes from
results straight to the next round's countdown. Fair turns rely on the host
and the room, helped by the colors. The TV screen choice is server state, so
a reloaded TV comes back on the right screen.

---

## ADR-039: At most six teams per event

**Status:** accepted (specs 03 and 24, Khai 2026-11-18). Narrows ADR-038's 1 to 10 teams.

Fair showdowns play one round per team where going first helps (spec 24,
6a), so 10 teams would make some games run 20 minutes or more.

**Decision:** an event has at most 6 teams. Making a seventh captain is
refused, and showdowns are built and play-tested for 1 to 6 teams. One
constant, `MAX_TEAMS` in `lib/teams/model.ts`, holds the limit for both.

**Consequences:** the TV only has to lay out 6 teams. A bigger party gets
bigger teams, not more of them.

---

## ADR-040: Every game can run solo or as a showdown, chosen per event

**Status:** superseded by ADR-041 (only "New games are built in both modes"
and converting every existing game). Accepted (Khai, 2026-11-18). Extends
ADR-036 and spec 24.

Khai wants to decide per event whether a game is played on everyone's phone or
as a team showdown on the TV.

**Decision:** a game type may have a solo version (in `lib/games`), a showdown
version (in `lib/live`), or both, under the same type id. An event's game
entry picks one with `mode` (`solo` or `live`). New games are built in both
modes, sharing one core for dealing and scoring (the perception games, spec 28,
are the first). The existing games are converted over time (backlog).

**Consequences:** the game library lists each type once with the modes it has.
Content for a type is checked against whichever version the event uses. A game
built in only one mode can still only be used in that mode until it's converted.

## ADR-041: A game gets a mode only where it plays well that way

**Status:** accepted (Khai, 2026-11-19). Supersedes part of ADR-040.

A showdown plays on one captain's phone while the room watches, so a round
scores a few people where a solo game scores everyone. A second mode is only
worth building when the game is better in it, not to fill a grid.

**Decision:** ADR-040's mechanism stays: one type id, a solo version, a
showdown version or both, and the event's `mode` picks. But a game gets a
mode only where it plays well that way:

- A showdown needs a short task every team does at once, that the room
  enjoys watching and a team can help with (shouting a count, arguing an angle).
- A solo version needs the game to still make sense with no other team to
  read or take turns against.

Agreed conversions: Color Matcher as a showdown; Fly-by Count, Snow Sum and
Color Count as solo. Everything else stays in the mode it has: the long
puzzles, room and judged games (Secret Word, Picture Slide, Block Fit,
Pathfinder, Stack Attack, Geocache, Guessing Jar, Photo Challenge, Quick
Draw) stay solo; T-Timer, Rapid Recall and Trivia stay solo because Blind
Stop, Memory Path and the buzzer round already cover them as team games; the
nerve and turn showdowns stay showdowns; Last Second and Tap Masher stay as
they are.

**Consequences:** new games are designed for the mode that fits, and get the
other only if it passes the same test.

## ADR-042: Photo backups are a folder and a CSV, cleared through the site

**Status:** accepted (2026-11-21). Refines ADR-012 (the zip).

**Decision:** `npm run photos:export` saves every photo (spec 20) and kept
drawing (spec 18) still in Blob to `backups/<slug>/` with `files.csv`, rather
than a zip: a folder uploads to Drive as it is and needs no zip library.
`npm run photos:prune` deletes them. Both scripts sign in with the admin
passphrase and call the site's own admin endpoint
(`/api/admin/events/[slug]/backup`), so the laptop needs no Firebase or Blob
keys. The prune refuses until the event has ended, and unless the count
given matches what's in Blob, so nothing that wasn't exported is deleted.
Records stay, marked `archived` with the backup location (ADR-012).

**Consequences:** the backup is only as good as the upload and count check
in the runbook. Team selfies (spec 31) join the same export when they're built.

## ADR-043: Color Count is merged into Fly-by Count

**Status:** accepted (Khai, 2026-11-24). Changes ADR-041's list of second modes.

Khai's play-test: Fly-by Count should start by counting every present, then
ask how many of one kind, only once they've flown past. That is Color Count's
idea on Fly-by's presents, and two games playing the same way would feel like
a repeat on the night.

**Decision:** Fly-by Count's later rounds mix red, white and green presents
and ask about one kind at the end (spec 25). Color Count, its showdown and its
solo version (spec 30), is removed from the library and the party.

**Consequences:** Fly-by Count teaches the "watch everything" trick in one
game. Spec 25 now covers four showdowns.

## ADR-044: Land Mass, Snow Pile, Sleigh Run, Lion Drum and the Color Matcher showdown are removed

**Status:** accepted (Khai, 2026-11-24). Changes ADR-040's and ADR-041's lists of games.

Khai's play-test of every showdown: Land Mass's controls were too hard on a
phone; Snow Pile was too close to the counting games; Sleigh Run, Lion Drum
and the Color Matcher showdown didn't earn their place on the night.

**Decision:** Land Mass (spec 27), Snow Pile, Sleigh Run and Lion Drum (spec 28,
both modes) and the Color Matcher showdown (spec 30) are removed from the
library, the party and the code. Solo Color Matcher (spec 18) stays. Their
acceptance criteria are marked retired in their specs.

**Consequences:** the night has fewer, stronger showdowns, and the TV's menu
fits one screen with room to spare. Bringing one back means building it again
from git history and a new ADR.

## ADR-045: Every showdown is worth 150, scored on how well a team did

**Status:** accepted (Khai, 2026-11-24). Replaces the ranked ladders of specs 25,
26 and 28 (100, 70, 50, 30, then 10) and Share or Snatch's ranked payout.

Khai's play-test: "I got 8.75 s and still 100 points." Ranking against the other
teams meant a poor answer could take full points, and the strategy games could
hand one team far more than any other game.

**Decision:** every showdown is worth up to 150 a game, split evenly over its
rounds (50 a round over three). A team scores on its own result, never its rank:
how close (counting, Blind Stop, Last Second, Staff Angle, Cut the Ribbon), or
what it won (Auction's prizes adding to 150, Stocking Stuffer's banked pot up to
the round's share, Share or Snatch's pot sized to 150, Present Shuffle's values
scaled so the best is the round's share). Snowball to 21 pays the winner the
round's share and every other team half; Memory Path pays a crossing all of it,
some right squares 80%, nothing half. Points never go below zero. Games with one
round per team split 150 over that many rounds. The buzzer round keeps its own
points per question.

**Consequences:** no one showdown decides the night; a near miss still scores;
results can be read without comparing teams. The team totals on the TV grow
more slowly than before, which suits a night of many games.


## ADR-046: Skill counts for more in the closeness and memory showdowns

**Status:** accepted (Khai, 2026-11-25). Changes how ADR-045 scores Staff Angle,
Cut the Ribbon, Last Second and Memory Path; the 150 a game stays.

The persona play-test found skill barely mattered: a random staff within 12° took
138 of 150, Memory Path paid 19 for one wrong arrow against 30 for nearly
crossing, and stopping Last Second with 2 s left still scored 40 of 50.

**Decision:** closeness falls off steeply. Staff Angle is full marks within 2°,
then the square of what's left of the miss up to 27°; Cut the Ribbon the same
within 1% and up to 12%. Last Second scores only the last 4 seconds, more the
later. Memory Path pays a crossing all of the round's share and anyone else 10%
for taking part plus up to 60% by how far along the path they got. Staff Angle's
rounds also grow: up to 180°, then 360°, then 540°.

**Consequences:** good play pulls ahead; a rough guess scores little but never
below zero. Younger players score less in these four games than before.
## ADR-047: The guest list is one document, and the raffle draws on the server

**Status:** accepted (Khai, 2026-11-25). Spec 32.

Door helpers poll the guest list on their phones for a couple of hours, and a
party has 50 to 150 guests. One Firestore document per guest would cost a read
per guest per poll and blow the free tier (`reference/free-tier-budget.md`).
Khai asked for the raffle to be "as fair as possible".

**Decision:** the guest list is one Firestore document (`events/{slug}/guests/list`,
well under the 1 MB limit at 1000 guests), changed in transactions and mirrored
to RTDB as one JSON string for polling, as ADR-031 does for teams. The raffle's
winner is drawn on the server with `crypto.randomInt` at the moment Stop is
pressed, each ticket equally likely; the names flipping on the TV are decoration
and never decide the pick. Its state rides on the live document beside the
screen, so the TV and Controls follow it as they do showdowns.

**Consequences:** a poll costs one RTDB read; two helpers' check-ins merge in a
transaction; nobody can steer the draw by timing a key press. The list is capped
at 1000 guests.

## ADR-048: Check-in opens with the party code, and the guest list lives in RTDB alone

**Status:** accepted (Khai, 2026-11-25). Changes ADR-047's storage and spec 32's
check-in code (A76).

Khai asked for the check-in page to open with "just the game code", not a
second passphrase to set and share. Building it showed the guest list needs no
Firestore copy: the live state already lives in RTDB alone (ADR-037), and one
value changed in transactions is all the list needs.

**Decision:** the check-in page asks for the event's join code and sends it in
an `x-checkin-code` header; the server checks it against the event's join code,
and the admin session works too. The code isn't secret, so it opens only
checking in and adding guests; uploads, tickets, removals and the raffle stay
admin-only. The guest list is one JSON value at `guests/{slug}` in RTDB,
changed in transactions, with no Firestore document.

**Consequences:** nothing extra to set before the party. Anyone who reads the
TV could tick guests in or add names; the host can fix that in Controls. One
poll is one RTDB read; the list is capped at 1000 guests.
