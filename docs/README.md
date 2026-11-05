# Docs

These docs drive development. Humans and AI agents read them before writing
code, and update them in the same commit as the code they describe.

## Reading order

| # | Doc | Read it when |
|---|-----|--------------|
| 1 | [ARCHITECTURE.md](ARCHITECTURE.md) | Always. The system on one page. |
| 2 | [GLOSSARY.md](GLOSSARY.md) | Always. The words used everywhere else. |
| 3 | [BACKLOG.md](BACKLOG.md) | Picking up work. The first unchecked item is next. |
| 4 | [specs/](specs/README.md) | Building a feature. One spec per feature. |
| 5 | [UI_CONVENTIONS.md](UI_CONVENTIONS.md) | Touching anything visible. |
| 6 | [conventions/](#conventions) | Writing code, tests, commits or docs. |
| 7 | [reference/](#reference) | Working with Firebase data, real-time or budgets. |
| 8 | [DECISIONS.md](DECISIONS.md) | Wondering why something is the way it is. |
| 9 | [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) | Something is undecided. |
| 10 | [runbooks/event-checklist.md](runbooks/event-checklist.md) | Before, during and after every event. |

## Conventions

- [engineering.md](conventions/engineering.md): quality bar, module layout, layers, definition of done
- [ai-workflow.md](conventions/ai-workflow.md): the test-first loop from backlog item to commit
- [code.md](conventions/code.md): TypeScript, naming, style
- [git.md](conventions/git.md): commits, branches, authorship
- [testing.md](conventions/testing.md): what to test and how
- [docs.md](conventions/docs.md): how to write and update specs, ADRs and the glossary

## Reference

- [data-model.md](reference/data-model.md): every Firestore and Realtime Database path
- [realtime.md](reference/realtime.md): presence, buzzer ordering, live leaderboard
- [free-tier-budget.md](reference/free-tier-budget.md): Firebase and Vercel limits and our usage math
- [security-rules.md](reference/security-rules.md): who can read and write what

## Rules for agents

1. Docs are the source of truth. If code and docs disagree, stop and ask.
2. Don't build from a `Draft` spec. Get it to `Ready` first.
3. Test first. Follow `conventions/ai-workflow.md` for every item.
4. Use glossary terms exactly. Add a term before using a new one.
5. Never rewrite an ADR. Add a new one that supersedes it.
