# AI workflow

How an agent (or a person) takes a backlog item from idea to `main`.

## The loop

1. **Pick.** The first unchecked item in `BACKLOG.md`.
2. **Check the spec.** If it is `Draft`, stop building. Interview Khai,
   fill in the spec from `_template.md` with numbered acceptance
   criteria, and get a yes. Then set it to `Ready`.
3. **Plan.** List the files to touch, and the tests to write, one per
   acceptance criterion. Reuse what exists: search `lib/` and
   `components/` before creating anything.
4. **Red.** Write the failing tests. Run them and see them fail for the
   right reason.
5. **Green.** Write the least code that passes.
6. **Refactor.** Remove duplication; check boundaries and names.
7. **Verify.** `npm run verify` passes. For UI, look at it at 375, 1024 and
   1920 px.
8. **Document.** Update the spec (status `Done`), data model, glossary,
   ADRs.
9. **Commit.** One item per commit, check it off in `BACKLOG.md`, no
   attribution (`git.md`).

## Slash commands (in `.claude/commands/`)

| Command | Does |
|---------|------|
| `/next` | Runs the loop above on the next backlog item |
| `/spec NN` | Interviews Khai to take spec NN from `Draft` to `Ready` |
| `/verify` | Runs `npm run verify` and fixes what it can |

## When unsure

- Docs and code disagree: stop and ask.
- A decision isn't covered: log it in `OPEN_QUESTIONS.md` with a default,
  and carry on only if it doesn't block.
- About to add a dependency, a database path or a paid service: check
  `free-tier-budget.md` and ask if it changes anything.
