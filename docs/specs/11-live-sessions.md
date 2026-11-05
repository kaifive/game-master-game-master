# 11: Live session engine

**Status:** Draft
**Backlog:** M3
**Depends on:** 03, 04, 06

## Summary

The generic engine for games the admin runs for the whole room at once. One session runs per event at a time; its state lives in Realtime Database and moves through a state machine driven from controls.

## In scope (first pass)

- Session lifecycle: lobby → playing → ended
- Round lifecycle: idle → open → locked → judged
- Admin actions: start, open round, lock, judge right or wrong, next, end
- All transitions checked by a pure state machine in `lib/live`
- Display and player views follow session state in real time
- Recovery: controls can reload mid-session without losing state

## Open questions

- Q7: only Jeopardy for the party?

## Acceptance criteria

To be written when this spec moves to `Ready`.
