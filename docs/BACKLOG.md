# Backlog

Work top to bottom. Resume from the first unchecked item. One commit per item.
A feature item needs its spec at `Ready` before it starts.

**Party: Saturday 2026-12-19.** Dates below are targets.

## M0: Foundations (by Nov 14)

- [x] Docs skeleton: architecture, glossary, decisions, conventions, spec list
- [x] Engineering standards, test strategy and AI workflow (ADR-015, ADR-016)
- [x] Review the architecture and standards with Khai; mark them accepted
- [x] Scaffold Next.js + TypeScript strict + Tailwind v4, Prettier, ESLint with boundary rules
- [x] Test harness: Vitest + Testing Library + coverage thresholds, Playwright, shared test builders
- [x] Firebase emulators wired for dev and tests; `npm run test:rules` with a first rules test
- [x] Shared foundations: `AppError`, `defineRoute()`, `variants()`, `lib/firebase/paths.ts`, logger
- [x] Design direction: Judges' Table, winter variant, for the holiday party (`docs/styles/judges-table.md`, ADR-022)
- [ ] Spec 09, style packs: slot registry and contracts, defaults, admin theme, Judges' Table winter pack, `/dev/ui` gallery; `DESIGN.md` written from the build at the end
- [ ] Spec 14, motion primitives: tokens, `useFlip`, `CountUp`, `BarRace`, `PointsBurst`, `Confetti`, reduced-motion fallbacks; in the gallery
- [x] `npm run check:ac` (acceptance-criteria-to-test check) and `npm run verify`
- [x] GitHub Actions CI running `verify` and e2e on every PR; PR template; git hooks
- [x] `.claude/commands/` for `/next`, `/spec`, `/verify`
- [ ] Firebase project on Spark: Anonymous Auth, Firestore, Realtime Database; env vars in `.env.example`
- [ ] Vercel project and Blob store on Hobby; preview deploys per PR (ask before production)

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
- More style packs from the earlier design options
