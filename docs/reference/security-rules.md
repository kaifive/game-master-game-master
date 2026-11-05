# Security rules

Who can do what. Rules live in `firebase/firestore.rules` and
`firebase/database.rules.json` and are tested against the emulator.
"Admin" means `request.auth.token.admin == true` (ADR-005). "Server" means
route handlers using `firebase-admin`, which bypass rules. "Owner device"
means `request.auth.uid == resource.data.deviceUid`.

## Firestore

| Path | Read | Write |
|------|------|-------|
| `events/{slug}` | anyone signed in (except `joinCode`: kept in a server-only field) | admin, server |
| `devices/{uid}` | that device, admin | server |
| `players/{playerId}` | anyone signed in | server only (join, rename, team, merge) |
| `nicknames/*` | nobody | server |
| `teams/*` | anyone signed in | server, admin |
| `ledger/*` | admin | server only |
| `plays/{gameId}_{playerId}` | owner device, admin | server |
| `photos/{photoId}` | admin; owner device; anyone signed in only if `approved` | server |
| `votes/*` | admin | server |
| `unlocks/*` | owner device (its players' unlocks), anyone signed in (`event` unlocks), admin | server |
| `codes/*` (top level) | nobody | server |

## Realtime Database

| Path | Read | Write |
|------|------|-------|
| `presence/{slug}/{uid}` | admin | that uid, only `{online, playerId, surface, lastSeen}` |
| `leaderboard/{slug}` | anyone | server |
| `live/{slug}/settings` | anyone | admin |
| `live/{slug}/session` | anyone | admin, server |
| `live/{slug}/captains` | anyone | admin, server |
| `moments/{slug}` | anyone | server |
| `live/{slug}/buzzes/{roundId}/{teamId}` | anyone | `auth.uid == captains/{teamId}/uid`, once, while the round is open, `at == now` |

## Vercel Blob

Only the server issues upload tokens (`/api/[event]/photos/upload`), one
per photo, limited to `image/jpeg`, 2 MB and the exact
`events/{slug}/photos/{photoId}.jpg` path. Deleting blobs is server-only.

## Route handler checks

Every player route checks: signed-in device, not banned, owns the
`playerId` it sends, player is `active`, event is live. Clients never write
points, ledger entries, plays, photos, votes or team membership directly.
