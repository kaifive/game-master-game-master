# 02: Player join and identity

**Status:** Draft
**Backlog:** M1
**Depends on:** 01, 06

## Summary

Players join an event from a QR code with only a nickname. Firebase Anonymous Auth gives each device a lasting uid. Layered defenses keep one person from joining many times to farm points.

## In scope (first pass)

- Anonymous sign-in on first visit; uid survives reloads
- Nickname rules: 2–16 characters, unique per event (case-insensitive), profanity filter
- Join policies: `open`, `approval` (lobby until admin approves), `roster` (claim a name from the event's list; claimed names lock to that device)
- Duplicate defenses: one player per uid per event; approval or roster; score once per game; admin remove and merge
- Rejoin on the same device returns to the same player
- Lost phone or cleared browser: admin can move a player to a new device

## Open questions

- Q2: join policy for the party (default `approval`)
- Should a flag show on controls when two players join from the same network within seconds?

## Acceptance criteria

To be written when this spec moves to `Ready`.
