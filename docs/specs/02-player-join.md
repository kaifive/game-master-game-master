# 02: Player join and identity

**Status:** Draft
**Backlog:** M1
**Depends on:** 01, 06

## Summary

Players join an event from a QR code with a nickname and start playing at once. The phone is a device (Firebase anonymous uid) that can hold several players, so families can share one phone (ADR-009). Moderation works without the admin watching the door (ADR-010).

## In scope (first pass)

- Anonymous sign-in on first visit; the device uid survives reloads
- Join needs the event's join code (in the QR link, so scanning fills it in)
- A `?code=` in the URL is kept through the join flow, so a player who scans a game's QR code lands in that game after picking a name (ADR-020)
- `/join` accepts any code and routes to its event and game
- Nickname: 2–16 characters, unique per event (case-insensitive), checked by the name filter as it is typed; failing names are rejected with "pick another name"
- Name filter: a blocklist with normalization (case, spacing, look-alike letters such as 0→o, 1→i), plus a per-event extra list; shared with team names
- Up to `maxPlayersPerDevice` players per device (default 4); "Add player" and "Switch player" on the hub
- Rejoin on the same device returns to the same players
- Admin: rename, remove, ban device (bans all its players), move a player to a new device (lost phone)
- `approval` policy available as an option: lobby with approve all and approve one

## Open questions

- None open. Names are a plain text box (ADR-013).

## Acceptance criteria

To be written when this spec moves to `Ready`.
