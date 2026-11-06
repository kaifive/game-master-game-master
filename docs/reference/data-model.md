# Data model

Every Firebase and Blob path. Build paths with `lib/firebase/paths.ts`,
never by hand. Status: **draft**; each spec finalizes its own part.

## Repo: event config

`content/events/<slug>.ts` exports an `EventConfig`:

```ts
type EventConfig = {
  slug: string;              // "holiday-2026"
  name: string;              // "Wushu Holiday Party 2026"
  timeZone: string;          // IANA, e.g. "America/New_York"
  schedule: { start: string; end?: string };  // ISO with offset; shown only, never acted on (ADR-024)
  style: StyleRef;           // { pack: "one-hour-photo", variant?: "holiday", colorMode: "dark" } (ADR-021)
  joinPolicy: "open" | "approval";        // default "open" (ADR-010)
  kind: "event" | "quick";                // quick = one game, code opens it (ADR-020)
  maxPlayersPerDevice: number;            // default 4 (ADR-009)
  blockedNames?: string[];                // extra name-filter words, server-only (spec 02)
  scoring: "individual" | "team" | "both"; // ADR-011
  maxTeams?: number;
  games: Game[];
};

type Game = {
  id: string;                // "daily-word-1", unique in the event
  type: GameType;            // "word-guess" | "photo-challenge" | "jeopardy" | ...
  title: string;
  mode: "solo" | "live";
  phase?: "individual" | "team";  // only playable in this phase, if set
  content: unknown;          // validated by the game type's content.ts
  style?: { variant?: string };  // per-game variant override; the pack is the event's
  scoring: { points: number; awardTo: "player" | "team" };
  opensAt?: string;
  closesAt?: string;
  visibility: "listed" | "hidden";         // hidden games appear only once unlocked
  codes?: GameCode[];                      // server-only; never sent to clients
};

type GameCode = {
  code?: string;                           // fixed code, or generated when left out
  action: "open" | "unlock";
  unlockScope?: "player" | "event";        // for unlock
  label?: string;                          // where it's hidden, for the admin: "under the snack table"
};
```

The join code is not in the repo. It is generated at first deploy and kept
in `events/{slug}.joinCode`.

## Firestore: durable records

```
events/{slug}
  status: "upcoming" | "live" | "ended"   set only by the admin (Start, End); missing = upcoming
  phase: "individual" | "team"            when scoring is "both"
  joinCode: string                        on the QR poster and display
  adminLastSeenAt: timestamp              for "new since you last looked"

events/{slug}/unlocks/{gameId}_{playerId | "event"}
  via: string                code that unlocked it
  at: timestamp

codes/{code}                 global index, server-only
  slug: string
  target: { kind: "event" } | { kind: "game"; gameId: string }
  action: "join" | "open" | "unlock"
  unlockScope?: "player" | "event"
  active: boolean            false once the event ends

events/{slug}/devices/{uid}
  banned: boolean
  playerIds: string[]

events/{slug}/players/{playerId}
  deviceUid: string
  nickname: string
  nicknameKey: string        lower case; accents, spaces and ' - . _ removed (spec 02)
  status: "active" | "pending" | "removed"   "pending" only under approval
  teamId: string | null      set once; only the admin changes it after
  points: number             own points: awards − donations given
  joinedAt: timestamp
  mergedInto?: string

events/{slug}/nicknames/{nicknameKey}
  playerId: string           unique nicknames per event (transaction)

events/{slug}/teams/{teamId}
  name: string
  nameKey: string
  color: number              index into --gm-team-N
  captainId: string          the player who leads it
  ownPoints: number          donations received + team awards
  createdAt: timestamp
  (team score = ownPoints + sum of members' points; kept in the leaderboard summary)

events/{slug}/ledger/{entryId}      append-only
  kind: "award" | "donation" | "void"
  points: number             always positive; direction comes from kind
  to: { kind: "player" | "team"; id: string }
  from?: { kind: "player"; id: string }    donations only
  reason: string             "Won Daily Word 1", "Donated to Team Dragon"
  source: { kind: "game" | "live" | "photo" | "vote" | "manual" | "donation"; id: string }
  voids?: string             entryId this void cancels
  createdAt: timestamp
  createdBy: "server" | "admin"

events/{slug}/plays/{gameId}_{playerId}
  state: unknown             game type's state, server-owned
  status: "playing" | "finished"
  scored: boolean
  points: number
  startedAt, finishedAt

events/{slug}/photos/{photoId}
  playerId: string           who took it
  teamId: string | null      set for team challenges
  gameId: string
  promptId: string
  blobUrl: string | null     null after the event is pruned
  blobPath: string           events/{slug}/photos/{photoId}.jpg
  width, height, bytes
  status: "pending" | "approved" | "hidden"
  votes: number              derived
  createdAt, reviewedAt
  archived?: { at: timestamp; backup: string }   ADR-012

events/{slug}/votes/{gameId}_{promptId}_{playerId}
  photoId: string            one vote per player per prompt
  createdAt
```

## Vercel Blob: files

```
events/{slug}/photos/{photoId}.jpg     shrunk JPEG, about 300 KB
```

Blob URLs are long and unguessable but public to anyone who has one. Only
send URLs of approved photos to players and the display.

## Realtime Database: live state

```
presence/{slug}/{uid}
  online: true               removed by onDisconnect
  playerId: string | null    the player currently active on this device
  surface: "player" | "display" | "controls"
  lastSeen: server timestamp

leaderboard/{slug}           written only by the server after each ledger entry
  updatedAt
  players/{playerId}: { nickname, teamId, points }
  teams/{teamId}: { name, color, points }     full team score

live/{slug}/settings         admin-set, live display settings
  colorMode: "light" | "dark"   overrides the event file's default, on phones and TV
  displayMode: "leaderboard" | "live" | "slideshow" | "message"
  message?: string

live/{slug}/session          current live session, or null
  id, gameId, type           "jeopardy"
  status: "lobby" | "playing" | "ended"
  board: ...                 type-specific public state
  round: {
    id: string
    status: "idle" | "open" | "locked" | "judged"
    prompt: ...
    openedAt: server timestamp
  }

live/{slug}/captains/{teamId}: { playerId, uid }
  Mirror of captains so RTDB rules can check them
  (RTDB rules cannot read Firestore).

live/{slug}/buzzes/{roundId}/{teamId}
  playerId: string
  at: server timestamp       set with ServerValue.TIMESTAMP; rules enforce it

moments/{slug}/{momentId}    written by the server; the display animates these
  kind: "game-finished" | "lead-change" | "big-donation" | "team-created"
      | "photo-winner" | "phase-change"
  text: string               "Mai finished Daily Word: +100"
  playerId?, teamId?, points?
  at: server timestamp
  Only the last 50 are kept; the display listens to the newest.
```
