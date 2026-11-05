# Data model

Every Firebase path. Build paths with `lib/firebase/paths.ts`, never by hand.
Status: **draft**; each spec finalizes its own part.

## Repo: event config

`content/events/<slug>.ts` exports an `EventConfig`:

```ts
type EventConfig = {
  slug: string;              // "winter-2026"
  name: string;              // "Wushu Holiday Party 2026"
  startsAt: string;          // ISO date-time
  endsAt: string;
  theme: ThemeRef;           // { id: "classic", variant?: "holiday", colorMode?: "dark" }
  joinPolicy: "open" | "approval" | "roster";
  roster?: string[];         // names, for the roster policy
  teams?: { id: string; name: string; color: number }[];  // starting teams
  games: Game[];
};

type Game = {
  id: string;                // "daily-word-1", unique in the event
  type: GameType;            // "word-guess" | "jeopardy" | ...
  title: string;
  mode: "solo" | "live";
  content: unknown;          // validated by the game type's content.ts
  theme?: Partial<ThemeRef>; // per-game override
  scoring: { points: number; awardTo: "player" | "team" | "both" };
  opensAt?: string;          // optional schedule
  closesAt?: string;
};
```

## Firestore: durable records

```
events/{slug}
  status: "upcoming" | "live" | "ended"     runtime override of the config dates

events/{slug}/players/{uid}
  nickname: string
  nicknameKey: string        lowercased, trimmed, for uniqueness
  status: "pending" | "approved" | "removed"
  teamId: string | null
  points: number             derived; maintained with each award
  joinedAt: timestamp
  mergedInto?: string        uid this player was merged into

events/{slug}/nicknames/{nicknameKey}
  uid: string                makes nicknames unique per event (transaction)

events/{slug}/teams/{teamId}
  name: string
  color: number              index into --gm-team-N
  captainId: string | null
  points: number             derived

events/{slug}/ledger/{awardId}      append-only
  to: { kind: "player" | "team"; id: string }
  points: number             negative only for a void
  reason: string             "Won Daily Word 1", "Jeopardy: Forms for 400"
  source: { kind: "game" | "live" | "manual"; id: string }
  voids?: string             awardId this entry cancels
  createdAt: timestamp
  createdBy: "server" | "admin"

events/{slug}/plays/{gameId}_{uid}
  gameId, uid
  state: unknown             game type's state, server-owned
  status: "playing" | "finished"
  scored: boolean            true once this play has paid out
  points: number
  startedAt, finishedAt
```

events/{slug}/photos/{photoId}
  uid: string                who took it
  gameId: string | null      the game that asked for it, if any
  prompt?: string            the challenge it answers
  blobUrl: string            Vercel Blob URL
  blobPath: string           events/{slug}/photos/{photoId}.jpg
  width, height: number
  bytes: number
  status: "pending" | "approved" | "hidden"
  createdAt, reviewedAt

## Vercel Blob: files

```
events/{slug}/photos/{photoId}.jpg     shrunk JPEG, about 300 KB
```

Blob URLs are long and unguessable but public to anyone who has one. Only
show URLs of approved photos to players and the display.

## Realtime Database: live state

```
presence/{slug}/{uid}
  online: true               removed by onDisconnect
  surface: "player" | "display" | "controls"
  lastSeen: server timestamp

leaderboard/{slug}           written only by the server after each award
  updatedAt
  players/{uid}: { nickname, teamId, points }
  teams/{teamId}: { name, color, points }

live/{slug}/session          current live session, or null
  id, gameId, type           "jeopardy"
  status: "lobby" | "playing" | "ended"
  board: ...                 type-specific public state (revealed cells, etc.)
  round: {
    id: string
    status: "idle" | "open" | "locked" | "judged"
    prompt: ...              what the display shows
    openedAt: server timestamp
  }

live/{slug}/captains/{teamId}: uid
  Mirror of team captains so RTDB rules can check them
  (RTDB rules cannot read Firestore).

live/{slug}/buzzes/{roundId}/{teamId}
  uid: string
  at: server timestamp       set with ServerValue.TIMESTAMP; rules enforce it
```
