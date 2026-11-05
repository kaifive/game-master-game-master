# Game Master: working notes for Claude

Game Master is a party-games platform Khai runs at live events. Players join
from their phones (no accounts, just a nickname) and play quick solo mini
games and host-run live games (Jeopardy-style buzzer rounds), earning points
for themselves and their team. Khai runs everything from an admin dashboard,
and a big-screen display shows the leaderboard and live boards.

First event: Wushu holiday party, December 2026, about 50 players.

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
- Free to run is a requirement. Check `docs/reference/free-tier-budget.md`
  before adding anything that reads or writes Firebase in a loop.

## Stack

Next.js (App Router) + TypeScript strict + Tailwind CSS v4 on Vercel Hobby.
Firebase: Anonymous Auth, Firestore, Realtime Database, all on the free
Spark plan. No Cloud Functions (they need Blaze); server logic lives in
Next.js route handlers using `firebase-admin`. No heavy UI libraries.

## Conventions

- Code: `docs/conventions/code.md`
- Git: `docs/conventions/git.md`
- Testing: `docs/conventions/testing.md`
- Writing docs and specs: `docs/conventions/docs.md`
- Look and feel: `docs/UI_CONVENTIONS.md`
