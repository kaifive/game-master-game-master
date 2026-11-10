# Free-tier budget

Game Master must run free (ADR-002). Check these numbers before adding
anything that reads or writes in a loop. Limits are as of late 2026;
re-check Firebase and Vercel pricing pages before each event.

## Limits

| Service | Free limit | Our ceiling |
|---------|------------|-------------|
| Realtime Database | **100 simultaneous connections** | Counted per device. Party: ~45 devices + display + controls. Up to 100 players fits if some share phones. |
| Realtime Database | 10 GB download per month, 1 GB stored | Small |
| Firestore | 50,000 reads per day | Watch this one |
| Firestore | 20,000 writes per day | Fine |
| Firestore | 1 GiB stored | Fine |
| Anonymous Auth | Free | Fine |
| Vercel Hobby | Non-commercial use; generous function limits | Fine for a private party |
| Vercel Blob (Hobby) | 1 GB stored, 10 GB transfer, 2,000 uploads per month | **Over the limit, Blob is blocked for 30 days, not billed** |

## Photos

At about 300 KB per photo:

| | Photos | Stored | Uploads used |
|---|--------|--------|--------------|
| Holiday party: 50 players × 5 photos | 250 | ~75 MB | 250 of 2,000 |

Showing a 250-photo slideshow on the display 10 times uses about 750 MB of
transfer. Comfortable.

Kept drawings (ADR-032) are SVGs of a few KB, one upload per finished run
of a game with `keepDrawings`: 50 players × 3 Quick Draw runs is ~150
uploads and under 10 MB.

Rules: always shrink on the phone first; cap at 2 MB per file; cap photos
per player per prompt. After every event, back up and clear its photos
(ADR-012, `runbooks/event-checklist.md`), so each event starts with the
full 1 GB.

## Estimate: holiday party, 50 players, 3 hours

| Activity | Count | Firestore reads | Firestore writes | RTDB download |
|----------|-------|-----------------|------------------|---------------|
| Joins and team picks | 50 | ~500 | ~200 | small |
| Solo games: 50 players × 8 games × ~8 moves | 3,200 moves | ~6,400 | ~6,400 | none |
| Awards (solo + live) | ~600 | ~1,800 | ~1,800 | small |
| Leaderboard: display + controls live, 50 phones every 15 s | 36,000 fetches | 0 | 0 | ~500 MB |
| Player hub listening to own player doc | 50 × ~30 changes | ~1,500 | 0 | none |
| Teams panel: 50 phones every 15 s, from the RTDB summary (ADR-031) | 36,000 fetches | 0 | 0 | ~100 MB |
| Team changes (captains, names, joins, moves), each rewriting the summary | ~100 | ~6,000 | ~200 | small |
| Donations | ~100 | ~300 | ~400 | small |
| Controls open all night, refreshing every minute (~55 reads each) | 180 | ~10,000 | 0 | small |
| **Total** | | **~26,000** | **~9,000** | **< 1 GB** |

About half of Firestore's daily read limit, 45% of writes. Fine, with room
for a rehearsal the same day. Controls pauses its refresh while its tab is
hidden.

## Things that would break the budget

- Polling anything built from Firestore on every phone. 50 phones every
  15 seconds is 12,000 polls an hour: publish an RTDB summary instead
  (ADR-031).
- Players listening live to a Firestore collection of all players or the
  ledger. Each change costs one read per listener. Use the RTDB summary.
- Re-reading event config from Firestore. It comes from the repo.
- More than ~90 devices at once (RTDB connections). Plan B: player phones
  connect to Realtime Database only on the live page, and presence falls
  back to a Firestore heartbeat every 2 minutes. Plan C: Blaze (about $0
  at this volume, but needs a card; ask first).
