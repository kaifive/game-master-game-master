---
description: Interview Khai to take a spec from Draft to Ready
argument-hint: "[spec number, e.g. 02]"
---

Take spec $ARGUMENTS in `docs/specs/` from `Draft` to `Ready`.

1. Read the spec, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`,
   `docs/DECISIONS.md`, `docs/OPEN_QUESTIONS.md` and every spec it depends
   on. Note what is already decided so you don't ask again.
2. List the gaps that change what gets built: behavior, edge cases, data,
   and the open questions linked to this spec.
3. Ask Khai about them with the AskUserQuestion tool, at most four
   questions per round, each with a recommended option first. Khai reads on
   a phone: keep questions short and self-contained.
4. Rewrite the spec on `docs/specs/_template.md`: summary, user stories,
   behavior, data, routes and real-time, UI per surface, edge cases,
   numbered acceptance criteria (`- [ ] AC-1: ...`), tests, out of scope.
   Every criterion must be concrete enough to test.
5. Move answered questions to the Answered table in
   `docs/OPEN_QUESTIONS.md`. Add ADRs for new decisions. Add new terms to
   the glossary. Update `docs/reference/data-model.md` and
   `docs/reference/security-rules.md` if the spec changes them.
6. Show Khai a short summary of the acceptance criteria and ask for a yes.
   Only then set the status to `Ready` and update `docs/specs/README.md`.
7. Commit the spec on its own.
