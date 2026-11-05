# Architecture decisions

Each decision is an ADR. To change one, add a new ADR that supersedes it.

---

## ADR-001: Same stack as Wushu Toolkit

**Status:** accepted

**Decision:** Next.js App Router, TypeScript `strict`, Tailwind CSS v4,
deployed on Vercel Hobby. Firebase for auth and data.

Khai already runs this stack, so there is one set of tools to know. Vercel
Hobby is free but non-commercial; a private party is fine. Revisit if Game
Master is ever paid for.

---

## ADR-002: Free to run, Firebase Spark plan, no Cloud Functions

**Status:** accepted

**Decision:** stay on Firebase Spark (free). Cloud Functions need the Blaze
plan, so all trusted server logic (scoring, awards, admin actions) runs in
Next.js route handlers with `firebase-admin`.

Any change that could push usage past free limits must update
`reference/free-tier-budget.md` first.

---

## ADR-003: Event definitions are files in the repo

**Status:** accepted

**Decision:** each event is `content/events/<slug>.ts`: name, dates, theme,
join policy, teams to start with, and its games with their content (word
lists, Jeopardy boards). Runtime state (players, points, sessions) lives in
Firebase, keyed by slug.

Files are versioned, reviewable and easy for AI to write. Adding an event
means a commit and a deploy, which is fine for a few events a year. An
in-app editor is a later backlog item.

---

## ADR-004: Firestore for records, Realtime Database for live state

**Status:** accepted

**Decision:** Firestore holds durable records: players, teams, the points
ledger, game results. Realtime Database holds fast-changing shared state:
presence, live sessions, buzzes, and the leaderboard summary.

- Realtime Database's `onDisconnect` gives accurate presence for free.
- Its server timestamps make buzz order fair regardless of phone clocks.
- Its free plan bills by bandwidth, not per read, so 50 screens watching a
  leaderboard that changes hundreds of times stays far under the limit.
  The same pattern on Firestore would use up the 50k reads a day.
- Cost: two databases and two sets of security rules.

---

## ADR-005: Players are anonymous; admin uses a shared passphrase

**Status:** accepted

**Decision:**
- Players sign in with Firebase Anonymous Auth. The uid is their device
  identity. They pick a nickname per event. No emails or passwords.
- The admin enters a passphrase (env `ADMIN_PASSPHRASE`). A route handler
  checks it and returns a Firebase custom token with the claim
  `admin: true`. Rules and route handlers trust that claim.

The admin login is a convenience gate, not strong security, by Khai's
choice. Rate-limit the sign-in route and keep the passphrase out of the repo.

---

## ADR-006: Points only come from the server and the ledger

**Status:** accepted

**Decision:** clients can never write points. Every award is an
append-only ledger entry written by a route handler (solo game results) or
an admin action (live sessions, manual awards). Totals and the leaderboard
summary are derived from the ledger and can be rebuilt from it. Mistakes
are fixed by voiding, never by deleting.

---

## ADR-007: Game logic, content and look are separate

**Status:** accepted

**Decision:** each game type has pure logic (`logic.ts`), a content shape
(`content.ts`) and a renderer (`Renderer.tsx`). Renderers read semantic
theme tokens and icon names only. A seasonal version of a game is a theme
variant, not new code. Scored solo games run their logic on the server, so
answers never reach the client.
