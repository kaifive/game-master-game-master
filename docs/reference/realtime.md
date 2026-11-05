# Real-time patterns

## Presence

Each open page writes `presence/{slug}/{uid}` when `.info/connected` turns
true, and registers `onDisconnect().remove()`. Controls count online
players by listening to `presence/{slug}`. A tab that closes or loses Wi-Fi
drops out within about a minute.

## Buzz order

Fairness comes from the database server's clock, not the phones'.

1. Admin opens a round: `round.status = "open"`, new `round.id`.
2. A captain's buzz writes `live/{slug}/buzzes/{roundId}/{teamId}` with
   `at: ServerValue.TIMESTAMP`. Rules allow it only if:
   the writer is that team's captain, the round is open, the round id is
   current, the team has not buzzed this round, and `at == now`.
3. Controls and Display listen to `buzzes/{roundId}` and sort by `at`.
   First is the one to answer; the rest are the queue.
4. The first buzz locks the round in the UI at once. The admin can still
   see everyone who buzzed for ties within a few milliseconds.
5. Judging (right or wrong) goes through a route handler that writes the
   award to the ledger and updates the round.

Network latency still matters: a captain on bad Wi-Fi arrives later. That
is accepted; test on the party venue's Wi-Fi in M4.

## Leaderboard

After every award the server rewrites the affected entries in
`leaderboard/{slug}` (one player and their team). Display and Controls
listen live. Player phones fetch it every 15 s instead of listening (Q8),
which keeps bandwidth low with 50 phones.

## Countdowns

Use `.info/serverTimeOffset` to align timers to server time, so a
"10 seconds to buzz" countdown ends at the same moment on every screen.

## Reconnects

Every surface must show an offline banner when `.info/connected` is false,
disable the buzzer while offline, and resume listeners without a reload.
