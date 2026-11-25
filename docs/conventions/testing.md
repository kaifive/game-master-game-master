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

## Showdown safety nets (Khai, 2026-11-24)

The first play-test found TV crashes and cut-off screens that no test drew.
Three checks now cover every showdown, so a new game is covered by adding it:

- **Stale views** (`components/live/games/stale-views.test.tsx`): every
  showdown's TV and captain's phone drawn from a view fetched up to 4 s
  before its clock, as polling does, with no throw and no console error.
- **Layout sweep** (`e2e/showdown-gallery.spec.ts`): every gallery moment on
  the TV (2 and 6 teams) and on phones: nothing cut off or off screen, no
  text over text, the TV never scrolls, no page errors. Mark anything
  clipped on purpose with `data-allow-clip`. The check is
  `e2e/support/layout.ts`.
- **Play-through** (`e2e/showdowns-play.spec.ts`): every showdown played on a
  real TV and two captains' phones over a network slowed by 250 ms, the
  host stepping with Next and the phones tapping whatever they're offered.
  It fails on any page error, a step that never comes, a TV that doesn't
  show a round's results, or a broken layout along the way. CI plays one
  round of each game (`SMOKE_ROUNDS`, one in CI); run it with every round before an
  event: `npx playwright test --project showdowns-play --no-deps`.

These catch crashes and broken layouts. They can't tell whether a game is fun,
fair or clear: that's what play-tests are for.

## Manual checks before an event

Real iPhone and Android, the display on the actual TV, the venue Wi-Fi.
These are in `runbooks/event-checklist.md`.
