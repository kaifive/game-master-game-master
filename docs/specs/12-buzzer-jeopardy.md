# 12: Buzzer and Jeopardy board

**Status:** Draft
**Backlog:** M3
**Depends on:** 11

## Summary

A Jeopardy-style live game: categories and point values on the display, team captains buzz on their phones, the admin judges, and points go to the team.

## In scope (first pass)

- Content: categories, clues, answers, values; optional final round
- Display: board, clue view, buzz order, team scores
- Captain phone: one huge buzzer; locked, ready and buzzed states; vibration on buzz
- Non-captains see the clue and their team's status
- Fair order by server timestamp (see `reference/realtime.md`)
- Wrong answer: optional point loss, next team in the queue or reopen
- Controls: pick clue, open buzzing, see the answer, judge

## Open questions

- Lose points for wrong answers?
- Who picks the next clue: admin, or the last team to answer right?

## Acceptance criteria

To be written when this spec moves to `Ready`.
