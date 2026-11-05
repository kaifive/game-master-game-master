# 01: Events and routing

**Status:** Draft
**Backlog:** M1
**Depends on:** none

## Summary

Each event is a config file in `content/events/` (ADR-003), served at `/[slug]`, with its games as children. The library at `/` lists every event so past events and their games stay available.

## In scope (first pass)

- `EventConfig` type and validation; registry of all events
- Library page (admin): upcoming, live, past
- Event status from dates, with an admin override (`events/{slug}.status`)
- Reserved slugs: `admin`, `api`, `_next`, `join`
- Quick games (`kind: "quick"`): an event with one game; its page is the game
- Every setting that varies by event lives in the event file, so each event can be configured without code changes
- 404 for unknown events and games; a closed page for ended events

## Open questions

- Should past events show final standings to anyone with the link?

## Acceptance criteria

To be written when this spec moves to `Ready`.
