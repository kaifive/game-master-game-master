# Code conventions

## TypeScript

- `strict` on. No `any`; use `unknown` and narrow.
- Named exports. Default exports only where Next.js requires them (pages,
  layouts, route handlers).
- Domain types live next to their module (`lib/points/types.ts`), named
  with glossary terms.
- Validate everything that crosses a trust boundary (request bodies,
  database reads, event config) with small hand-written parsers. No schema
  library unless an ADR adds one.

## Boundaries

- `lib/games/<type>/logic.ts` is pure: no React, no Firebase, no `Date.now()`
  (pass time in), no randomness without a seed.
- Only `lib/firebase/admin.ts` imports `firebase-admin`, and it starts with
  `import "server-only"`.
- Only route handlers and server actions write points, results or approvals.
- Client components call Firebase through `lib/firebase/client.ts` for reads,
  listeners, presence and buzzes. Nothing else.

## Files and naming

- Files: `kebab-case.ts`; components: `PascalCase.tsx`.
- One game type per folder under `lib/games/`.
- Route handlers under `app/api/<area>/<action>/route.ts`.
- Firebase paths are built by helpers in `lib/firebase/paths.ts`, never by
  string concatenation at call sites. See `reference/data-model.md`.

## Errors

- Route handlers return `{ error: string, code: string }` with a fitting
  status. Messages are plain sentences safe to show players.
- Never log secrets, tokens or the admin passphrase.

## Dependencies

Keep the list short. Each new runtime dependency needs a reason in the
commit message. No heavy UI, state management or animation libraries.
