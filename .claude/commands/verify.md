---
description: Run every quality gate and fix what fails
---

1. Run `npm run verify` (in a cloud session, `npm run verify:sandbox`).
   Never pipe it into `tail` or `grep`; read its exit code.
2. For each failure, fix the cause, not the check:
   - Formatting: `npm run format`.
   - Lint or types: fix the code. Don't add `eslint-disable`, `any`, `!` or
     `as` to silence it; if a boundary rule fires, move the code.
   - Tests: fix the code, or the test only if the spec says the test is
     wrong.
   - Coverage: add tests for the uncovered branches.
   - check:ac: add the missing `SNN-ACn` test.
3. Rerun until it passes, then report what was fixed.
