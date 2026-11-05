# Testing conventions

Test-driven (ADR-015). Write the failing test first, then the code.

## Levels

| Level | Tool | Location | What |
|-------|------|----------|------|
| Unit | Vitest | `lib/**/*.test.ts` | `rules.ts`, game `logic.ts`, `model.ts` schemas, services with in-memory repos |
| Component | Vitest + Testing Library + jsdom | `components/**/*.test.tsx` | Roles, states, keyboard, theme tokens applied |
| Contract | Vitest + Firebase emulator | `lib/**/repo.contract.ts` | One suite run against both `repo.memory` and `repo.firebase` |
| Rules | `@firebase/rules-unit-testing` + emulator | `firebase/tests/` | Every row of `reference/security-rules.md`, allowed and denied |
| End-to-end | Playwright + emulator | `e2e/` | Whole flows across several browsers: join, play, donate, buzz, triage |

## Naming acceptance criteria

Specs number their criteria (`AC-1`, `AC-2`). Tests that prove one start
with the spec and criterion id:

```ts
test("S04-AC3: a donation larger than the player's points is rejected", ...)
```

`npm run check:ac` fails if any criterion in a `Ready`, `Building` or
`Done` spec has no test naming it.

## Rules

- Pure logic gets exhaustive tests: every branch, every edge.
- No test touches the network or the real Firebase project. Emulators only.
- Time and randomness are injected (`clock`, `seed`), never read directly.
- Fixtures and builders live in `tests/builders/` (`aPlayer()`,
  `anEvent()`), shared by every test. Don't hand-build the same object twice.
- A bug fix starts with a test that reproduces the bug.
- Tests must be deterministic. A flaky test is fixed or deleted the same day.

## Commands

```
npm test              unit + component (watch with npm test -- --watch)
npm run test:rules    security rules against the emulator
npm run test:rules:sandbox  same, for cloud sandboxes whose proxy blocks the Firebase CLI
npm run test:contract repository contract tests against the emulator
npm run test:e2e      Playwright against the emulator and a local build
npm run verify        everything CI runs
```

## Manual checks before an event

Real iPhone and Android, the display on the actual TV, the venue Wi-Fi.
These are in `runbooks/event-checklist.md`.
