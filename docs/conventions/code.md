# Code conventions

See `engineering.md` for the module layout, layers and definition of done.

## TypeScript

- `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- No `any`, no non-null `!`, no `as` casts except in tests and at
  validated boundaries.
- Types come from Zod schemas where data crosses a boundary
  (`type Award = z.infer<typeof Award>`). Don't write a type and a
  schema for the same shape.
- Named exports. Default exports only where Next.js requires them.
- Discriminated unions over boolean flags (`status: "open" | "locked"`).
- Use glossary terms for names, exactly.

## Files and naming

- Files: `kebab-case.ts`; components: `PascalCase.tsx`.
- Tests next to the code: `rules.test.ts`, `Button.test.tsx`.
- Route handlers at `app/api/<area>/<action>/route.ts`, built with `defineRoute()`.
- Firebase paths come from `lib/firebase/paths.ts` only.

## Style

- Prettier formats everything; don't argue with it.
- Functions do one thing. Over about 40 lines, split it.
- Comments say why, not what.
- No dead code, no commented-out code, no TODOs without a backlog item.

## Dependencies

Keep the list short. Each new runtime dependency needs a reason in the
commit message, and a size check for anything that ships to phones. No
heavy UI, state management or animation libraries.

## Secrets

Only through environment variables, documented in `.env.example`. Never
logged, never committed.
