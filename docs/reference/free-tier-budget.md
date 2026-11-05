# Free-tier budget

Game Master must run free (ADR-002). Check these numbers before adding
anything that reads or writes in a loop. Limits are as of late 2026;
re-check Firebase and Vercel pricing pages before each event.

## Limits

| Service | Free limit | Our ceiling |
|---------|------------|-------------|
| Realtime Database | **100 simultaneous connections** | 50 players + display + controls ≈ 55. **Hard cap around 90 people.** |
| Realtime Database | 10 GB download per month, 1 GB stored | Small |
| Firestore | 50,000 reads per day | Watch this one |
| Firestore | 20,000 writes per day | Fine |
| Firestore | 1 GiB stored | Fine |
| Anonymous Auth | Free | Fine |
| Vercel Hobby | Non-commercial use; generous function limits | Fine for a private party |

## Estimate: holiday party, 50 players, 3 hours

| Activity | Count | Firestore reads | Firestore writes | RTDB download |
|----------|-------|-----------------|------------------|---------------|
| Joins and team picks | 50 | ~500 | ~200 | small |
| Solo games: 50 players × 8 games × ~8 moves | 3,200 moves | ~6,400 | ~6,400 | none |
| Awards (solo + live) | ~600 | ~1,800 | ~1,800 | small |
| Leaderboard: display + controls live, 50 phones every 15 s | 36,000 fetches | 0 | 0 | ~500 MB |
| Player hub listening to own player doc | 50 × ~30 changes | ~1,500 | 0 | none |
| **Total** | | **~10,000** | **~8,400** | **< 1 GB** |

About 20% of Firestore's daily read limit, 40% of writes. Comfortable.

## Things that would break the budget

- Players listening live to a Firestore collection of all players or the
  ledger. Each change costs one read per listener. Use the RTDB summary.
- Re-reading event config from Firestore. It comes from the repo.
- More than ~90 people at once (RTDB connections). Past that, move to the
  Blaze plan (still about $0 at this volume, but needs a card; ask first).
