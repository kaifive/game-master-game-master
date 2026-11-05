# Testing conventions

Runner: `node:test` via `tsx` (`npm test`), as in Wushu Toolkit.

## Must have tests

- **Game logic:** every game type's `logic.ts`: create, every move outcome,
  game over, scoring. Pure functions, so these are fast and exhaustive.
- **Points:** award, void, totals, rebuilding totals from the ledger.
- **Live session state machine:** every allowed and rejected transition,
  buzz ordering, judging.
- **Parsers:** request bodies and event config validation.
- **Security rules:** against the Firebase emulator. A player cannot write
  points, another player's data, or buzz unless they are the captain of
  their team in an open round.

## Should have

- Route handlers with a fake Firestore or the emulator.
- A load script (`scripts/load-test.ts`) that simulates N players for M4.

## Manual checks before a party

Listed in spec acceptance criteria: real iPhone and Android, the display on
the actual TV, Wi-Fi dropouts.
