---
description: Take the next backlog item from spec to commit, test-first
---

Work the next item in `docs/BACKLOG.md` using the loop in
`docs/conventions/ai-workflow.md`. $ARGUMENTS

1. Find the first unchecked item in `docs/BACKLOG.md`. Say which one.
2. If it builds a feature, open its spec in `docs/specs/`. If the spec is
   `Draft`, stop and run the `/spec` flow with Khai instead of building.
3. Read what the item touches: `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`,
   `docs/reference/data-model.md`, and the existing code in `lib/` and
   `components/`. Reuse before creating.
4. Plan the files and one test per acceptance criterion (`SNN-ACn: ...`).
5. Red: write the failing tests and run them. Confirm they fail for the
   right reason.
6. Green: write the least code that passes.
7. Refactor: remove duplication, check names against the glossary and
   imports against the boundaries in `docs/conventions/engineering.md`.
8. For UI: follow `docs/UI_CONVENTIONS.md` and `DESIGN.md`, use the shared
   primitives, then run `/impeccable critique` and `/impeccable audit` on
   what changed and fix P0 and P1 findings. Check 375, 1024 and 1920 px.
9. Run `npm run verify` (`npm run verify:sandbox` in cloud sessions). Fix
   until it passes.
10. Update the spec (set it to `Done` when the feature is complete), the
    data model, glossary and ADRs as needed. Check the item off in the
    backlog.
11. Commit: one item per commit, no attribution (`docs/conventions/git.md`).
12. Report what was done, what was tested, and anything left open.
