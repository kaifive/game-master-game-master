# Security rules

Who can do what. Rules live in `firebase/firestore.rules` and
`firebase/database.rules.json` and are tested against the emulator.
"Admin" means `request.auth.token.admin == true` (ADR-005). "Server" means
route handlers using `firebase-admin`, which bypass rules.

## Firestore

| Path | Read | Write |
|------|------|-------|
| `events/{slug}` | anyone | admin, server |
| `players/{uid}` | anyone signed in | create own doc only via server join route; nothing else from clients |
| `nicknames/*` | nobody | server |
| `teams/*` | anyone signed in | admin, server |
| `ledger/*` | admin | server only (admin awards go through a route) |
| `plays/{gameId}_{uid}` | that player, admin | server |
| `photos/{photoId}` | admin; owner; anyone signed in if `approved` | server |

## Vercel Blob

Only the server can issue upload tokens (`/api/[event]/photos/upload`),
one per photo, limited to `image/jpeg`, 2 MB and the exact
`events/{slug}/photos/{photoId}.jpg` path. Deleting blobs is server-only.

## Realtime Database

| Path | Read | Write |
|------|------|-------|
| `presence/{slug}/{uid}` | admin | that uid, only `{online, surface, lastSeen}` |
| `leaderboard/{slug}` | anyone | server |
| `live/{slug}/session` | anyone | admin, server |
| `live/{slug}/captains` | anyone | admin, server |
| `live/{slug}/buzzes/{roundId}/{teamId}` | anyone | that team's captain, once, while the round is open, `at == now` |

Clients never write `points`, ledger entries, results or approvals.
