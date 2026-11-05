# Engineering standards

The quality bar for Game Master. Tooling enforces as much of this as
possible, so it doesn't rely on anyone (human or AI) remembering.

## Principles

1. **Test first.** No production code without a failing test that needs it.
2. **One place for each thing (DRY).** One schema per shape, one component
   per pattern, one helper per repeated step. If you write something a
   second time, extract it; the third time is a bug.
3. **Pure core, thin edges.** Rules and game logic are pure functions.
   Firebase, HTTP and React sit at the edges and stay thin.
4. **Depend on interfaces.** Services use repository interfaces, so they
   are tested without a database.
5. **Make wrong code fail loudly.** Strict types, validated boundaries,
   lint rules for boundaries, coverage thresholds.
6. **Small and reviewable.** One backlog item per commit, one feature per PR.

## Feature module layout (ADR-016)

```
lib/<feature>/
  model.ts            types and Zod schemas, shared by client and server
  rules.ts            pure domain logic; no I/O, no clock, no randomness
  repo.ts             repository interface
  repo.firebase.ts    Firestore / Realtime Database implementation
  repo.memory.ts      in-memory implementation for tests
  service.ts          server use cases ("server-only"); uses repo interfaces
  client.ts           client hooks and listeners (optional)
  index.ts            the public API; other code imports only from here
  *.test.ts           next to what they test
```

Dependency direction, enforced by ESLint:

```
app/ (pages, routes)  →  lib/<feature>/index  →  service  →  repo interface
                                                   ↓
                                                 rules, model
components/           →  lib/<feature>/model, client
rules.ts, model.ts    →  nothing with I/O
```

- A feature may import another feature only through its `index.ts`.
- Only `lib/firebase/` and each feature's `repo.firebase.ts` import Firebase
  SDKs (plus contract and rules tests).
- `components/ui/` imports nothing from `lib/` except `lib/themes` and
  `lib/ui` helpers.

## Route handlers

Every route is one call to `defineRoute()`:

```ts
export const POST = defineRoute({
  auth: "player",              // "none" | "player" | "admin"
  body: DonateRequest,         // Zod schema from lib/points/model
  rateLimit: "player-action",
  handler: ({ body, player, event }) => points.donate(event, player, body),
});
```

`defineRoute()` owns sign-in checks, device ownership, ban checks, body
parsing, rate limits and turning `AppError`s into responses. Route files
contain no logic.

## Errors

- Domain failures are `AppError` with a code from one `ErrorCode` union
  (`NAME_REJECTED`, `INSUFFICIENT_POINTS`, `ROUND_NOT_OPEN`, ...) and a
  plain message safe to show players.
- Unexpected errors are logged with context and shown as a generic retry.
- Every page has an error boundary and the states in `UI_CONVENTIONS.md`.

## Components

- `components/ui/`: primitives (Button, Card, Sheet, ...). Theme tokens
  only. Each has a test covering roles, states and keyboard use.
- `components/<surface>/`: compositions for player, controls and display.
- A dev-only gallery at `/dev/ui` shows every primitive in every state
  and theme. It is the living style guide.
- Variants go through one small `variants()` helper, not ad-hoc class strings.

## Definition of done

An item is done when all of these are true:

- [ ] Spec is `Ready` (or `Done`), with numbered acceptance criteria.
- [ ] Each acceptance criterion has a test that names it (`S04-AC3`).
- [ ] `npm run verify` passes: format, lint, types, unit and component
      tests with coverage, rules tests, AC check, build.
- [ ] E2E test added or updated for any user-visible flow.
- [ ] Works at 375 px wide (player), 1024 px (controls), 1920 px (display).
- [ ] UI changes pass `/impeccable critique` and `/impeccable audit` with no
      P0 or P1 findings, and match `DESIGN.md`.
- [ ] Docs updated: spec, data model, glossary, ADR if a decision changed.
- [ ] Backlog item checked off in the same commit.

## Budgets

| | Target |
|---|--------|
| Player page JavaScript | under 150 KB gzipped |
| Lighthouse mobile (player hub) | 90+ performance and accessibility |
| Buzz to display | under 300 ms on venue Wi-Fi |
| Coverage, `lib/**` | 90% lines, 85% branches |
| Coverage, `components/**` | 80% lines |
