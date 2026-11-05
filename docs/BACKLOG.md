# Backlog

Work top to bottom. Resume from the first unchecked item. One commit per item.
A feature item needs its spec at `Ready` before it starts.

**Party: Saturday 2026-12-19.** Dates below are targets.

## M0: Foundations (by Nov 12)

- [x] Docs skeleton: architecture, glossary, decisions, conventions, spec list
- [ ] Review the architecture with Khai; mark it accepted
- [ ] Scaffold Next.js + TypeScript strict + Tailwind v4; `npm run check`, `npm test`, `npm run build`
- [ ] Firebase project on Spark: Anonymous Auth, Firestore, Realtime Database; env vars documented
- [ ] Vercel Blob store on Hobby; token env var documented
- [ ] Security rules for both databases, with tests against the emulator
- [ ] First Vercel deploy (preview only; ask before production)

## M1: Core event loop (by Nov 26)

- [ ] Spec 01, events and routing: event config type, registry, library page, reserved slugs
- [ ] Spec 06, admin auth: passphrase sign-in, admin claim, guarded routes
- [ ] Spec 02, player join: devices, several players per device, join code, name filter, kick and ban
- [ ] Spec 04, points ledger: awards, donations, voids, totals, rebuild
- [ ] Spec 03, teams: phases, captains, team names, one-tap join
- [ ] Spec 05, leaderboard and display
- [ ] Spec 07, controls: players by device, "new since you looked", phases, manual awards

## M2: Solo games and photos (by Dec 6)

- [ ] Spec 08, game framework: game type contract, move route, results, score once
- [ ] Spec 09, theming: tokens, color modes, variants, icon sets; holiday variant
- [ ] Spec 10, word guess: the first solo game
- [ ] Spec 13, photos: upload, swipe triage, photo challenge, photo vote, slideshow
- [ ] Photo export and prune scripts (ADR-012)

## M3: Live sessions (by Dec 13)

- [ ] Spec 11, live session engine: state machine, rounds, admin controls
- [ ] Spec 12, buzzer and Jeopardy board

## M4: Party ready (Dec 14–18)

- [ ] Load test: 60 simulated players, display and controls; check free-tier usage
- [ ] Holiday party event file: games, content, holiday theme
- [ ] Run the "two weeks before" and "week before" lists in `runbooks/event-checklist.md`
- [ ] Dry run with a few real people
- [ ] Production deploy (with Khai's go-ahead)

## Later

- Second solo game (Q6)
- Admin recap page polish; results archive per past event
- Automatic photo screening (Q18; costs money)
- In-app editor for events and game content
- More live session types (Jackbox-style prompts, polls)
- Custom domain
