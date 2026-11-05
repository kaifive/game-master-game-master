# Game Master: working notes for Claude

Game Master is a party-games platform Khai runs at live events. Players join
from their phones (no accounts, just a nickname) and play quick solo mini
games and host-run live games (Jeopardy-style buzzer rounds), earning points
for themselves and their team. Khai runs everything from an admin dashboard,
and a big-screen display shows the leaderboard and live boards.

First event: Wushu holiday party, Saturday 2026-12-19, about 50 players.
Up to 100 players at once in later events.

This is an AI-first repo: the docs are the source of truth and the code
follows them.

## Read first

1. `docs/README.md`: map of the docs and the order to read them in.
2. `docs/ARCHITECTURE.md`: how the system fits together.
3. `docs/BACKLOG.md`: what is done and what is next. Resume from the first
   unchecked item.
4. The spec in `docs/specs/` for the feature you are working on. Do not
   build a feature whose spec is still `Draft`: get it to `Ready` with Khai
   first.

## Standing rules

- **Test first, every time.** Follow `docs/conventions/ai-workflow.md`:
  failing tests named after acceptance criteria, then code, then refactor.
  Nothing is done until `npm run verify` passes and the definition of done
  in `docs/conventions/engineering.md` is met.
- **DRY and reuse.** Search `lib/` and `components/` before writing
  anything new. One schema per shape, one component per pattern.

- Docs change with the code. If behavior changes, update its spec in the
  same commit.
- Architecture decisions go in `docs/DECISIONS.md` as ADRs. Change one by
  adding a new ADR that supersedes it, not by editing the old one.
- Questions for Khai go in `docs/OPEN_QUESTIONS.md`. Log non-blocking ones
  there and proceed on the stated default.
- New domain words go in `docs/GLOSSARY.md`. Use glossary terms in code
  and docs exactly as defined.
- Commits and PRs have **no attribution**: no Co-Authored-By, no session
  links, no "Generated with" footers. Commit as Khai Nguyen
  <tuongkhai.nguyen@gmail.com>.
- Small commits, one per backlog item.
- Ask before anything expensive or irreversible: deploys to production,
  paid services or enabling Firebase Blaze billing, deleting data, changing
  Firebase security rules in production.
- Before and after every event, follow `docs/runbooks/event-checklist.md`
  (back up and clear photos so Blob has room).
- Free to run is a requirement. Check `docs/reference/free-tier-budget.md`
  before adding anything that reads or writes Firebase in a loop.

## Stack

Next.js (App Router) + TypeScript strict + Tailwind CSS v4 on Vercel Hobby.
Firebase: Anonymous Auth, Firestore, Realtime Database, all on the free
Spark plan. No Cloud Functions (they need Blaze); server logic lives in
Next.js route handlers using `firebase-admin`. Photo files go to Vercel Blob
(Firebase Storage needs Blaze; ADR-008). No heavy UI libraries.

## Commands

```
npm run dev        local dev server
npm run emulators  Firebase emulators (auth, Firestore, Realtime Database)
npm test           unit + component tests (Vitest)
npm run test:rules security rules (emulator)
npm run test:e2e   end-to-end (Playwright)
npm run verify     every gate CI runs; must pass before commit
npm run verify:sandbox   same, in cloud sessions where the proxy blocks the Firebase CLI
```

Chain checks with `&&` or run `npm run verify`; never pipe a check into
`tail` or `grep`, which hides its exit code.

## Design

Fun and playful, never generic. Use the Impeccable skill
(`/impeccable ...`) for all UI work; it reads `PRODUCT.md` and `DESIGN.md`
at the repo root. See `docs/UI_CONVENTIONS.md` and ADR-017.

## Conventions

- Engineering standards: `docs/conventions/engineering.md`
- AI workflow: `docs/conventions/ai-workflow.md`
- Code: `docs/conventions/code.md`
- Git: `docs/conventions/git.md`
- Testing: `docs/conventions/testing.md`
- Writing docs and specs: `docs/conventions/docs.md`
- Look and feel: `docs/UI_CONVENTIONS.md`
