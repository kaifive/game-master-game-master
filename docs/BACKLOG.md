# Backlog

Work top to bottom. Resume from the first unchecked item. One commit per item.
A feature item needs its spec at `Ready` before it starts.

Target: everything through M4 done a week before the holiday party (see Q1).

## M0: Foundations

- [x] Docs skeleton: architecture, glossary, decisions, conventions, spec list
- [ ] Review the architecture with Khai; mark it accepted
- [ ] Scaffold Next.js + TypeScript strict + Tailwind v4; `npm run check`, `npm test`, `npm run build`
- [ ] Firebase project on Spark: Anonymous Auth, Firestore, Realtime Database; env vars documented
- [ ] Vercel Blob store on Hobby; token env var documented
- [ ] Security rules for both databases, with tests against the emulator
- [ ] First Vercel deploy (preview only; ask before production)

## M1: Core event loop

- [ ] Spec 01, events and routing: event config type, registry, library page, reserved slugs
- [ ] Spec 06, admin auth: passphrase sign-in, admin claim, guarded routes
- [ ] Spec 02, player join: anonymous sign-in, nickname, join policy, lobby
- [ ] Spec 03, teams and captains
- [ ] Spec 04, points ledger: award, void, totals, rebuild
- [ ] Spec 05, leaderboard and display
- [ ] Spec 07, controls: players, approvals, teams, manual awards, presence

## M2: Solo games

- [ ] Spec 08, game framework: game type contract, move route, results, score once
- [ ] Spec 09, theming: tokens, color modes, variants, icon sets; holiday variant
- [ ] Spec 10, word guess: the first solo game
- [ ] Spec 13, photos: upload, moderation, photo challenge game, display slideshow, recap
- [ ] Second solo game (pick with Khai, see Q6)

## M3: Live sessions

- [ ] Spec 11, live session engine: state machine, rounds, admin controls
- [ ] Spec 12, buzzer and Jeopardy board

## M4: Party ready

- [ ] Load test: 60 simulated players, display and controls; check free-tier usage
- [ ] Holiday party event file: teams, games, content, holiday theme
- [ ] QR code poster and join flow tested on iPhone and Android
- [ ] Dry run with a few real people
- [ ] Production deploy (with Khai's go-ahead)

## Later

- In-app editor for events and game content
- Results archive page per past event
- Export an event's photos as a zip; prune old events from Blob
- More live session types (Jackbox-style prompts, polls)
- Custom domain
