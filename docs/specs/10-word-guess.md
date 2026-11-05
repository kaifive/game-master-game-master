# 10: Word guess (first solo game)

**Status:** Draft
**Backlog:** M2
**Depends on:** 08, 09

## Summary

A Wordle-style game: guess a hidden word in a limited number of tries, with per-letter feedback. Generic over word length and tries, so it can be reused with themed word lists (wushu terms, holiday words).

## In scope (first pass)

- Content: list of answers, allowed guesses, word length, max tries
- Server checks each guess; answer never sent to the client
- Scoring: points scale with tries left
- Renderer: tile grid and on-screen keyboard, theme tokens and icons only
- Share-free result screen showing points earned

## Open questions

- Word lists for the party: wushu terms, holiday words, or both?
- Fixed word per game for everyone (fair, comparable) or random per player? Default: same word for everyone.

## Acceptance criteria

To be written when this spec moves to `Ready`.
