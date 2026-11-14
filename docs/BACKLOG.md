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
- [x] Spec 09, style packs: slot registry and contracts, defaults, admin theme, Judges' Table winter pack, `/dev/ui` gallery
- [x] Impeccable finish review and `DESIGN.md` (via its documenter), once the first player and TV screens exist
- [x] Spec 14, motion primitives: tokens, `useFlip`, `CountUp`, `BarRace`, `PointsBurst`, toast chain, stage queue, `Celebration` slot, confetti, reduced-motion fallbacks; `/dev/ui/motion`
- [x] `npm run check:ac` (acceptance-criteria-to-test check) and `npm run verify`
- [x] GitHub Actions CI running `verify` and e2e on every PR; PR template; git hooks
- [x] `.claude/commands/` for `/next`, `/spec`, `/verify`
- [x] Firebase project on Spark: Anonymous Auth, Firestore, Realtime Database; env vars in `.env.example`; client and admin wiring (`lib/firebase`)
- [x] Vercel project and Blob store on Hobby; preview deploys per PR (ask before production)

## M1: Core event loop (by Nov 26)

- [x] Spec 01, events and routing: event files, manual status, code-box home, `/join`, event pages in their pack, final standings, not-found pages
- [x] Spec 06, admin auth: passphrase sign-in, signed session cookie (ADR-028), guarded routes
- [x] Spec 02, player join: devices, one player per phone with limited restarts (ADR-027), join code, name filter (kick and ban moved to spec 07)
- [x] Spec 04, points ledger: awards, voids, totals, rebuild (donations with spec 03)
- [x] Spec 03, teams: phases, captains, team names, one-tap join, team games, donations, team standings
- [x] Spec 05, leaderboard and display (individual; teams with spec 03, modes with spec 07)
- [x] Spec 07, controls first pass: event library, Start/End/Reopen, players with fix-ups, rebuild, clear test data (later: "new since you looked", phases, display modes)

## M2: Solo games and photos (by Dec 6)

- [x] Spec 08, game framework: game type contract, move route, results, score once (points reach the ledger with spec 04)
- [x] Spec 09, theming: tokens, color modes, variants, icon sets; holiday variant
- [x] Spec 10, trivia: the first solo game (replaces word guess)
- [x] Spec 16, quick games: T-Timer, Tap Masher, Pathfinder, Stack Attack, Rapid Recall
- [x] Spec 17, Guessing Jar (scored when the host enters the count) and Geocache (hidden codes)
- [x] Spec 18, Color Matcher and Quick Draw (auto-judged against the logo)
- [x] Spec 19, Secret Word: a five-letter word puzzle; wushu answers at the party
- [x] Spec 20, photo challenge (Spot and Snipe): photos rated by the host with a slider
- [x] Spec 21, Number Slide: the 3×3 sliding tile puzzle
- [x] Spec 22, Block Fit: fit grid pieces into a rectangle
- [ ] Spec 13, photos: swipe triage, photo vote, slideshow (the photo challenge is spec 20)
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

- Spec 15, game codes and hidden games: not needed for the holiday party, where every game is open (Khai, 2026-11-07)
- Second solo game (Q6)
- Admin recap page polish; results archive per past event
- Automatic photo screening (Q18; costs money)
- In-app editor for events and game content
- More live session types (Jackbox-style prompts, polls)
- Custom domain
- More style packs from the earlier design options
