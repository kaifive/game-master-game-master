# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router), TypeScript strict, Tailwind CSS v4 on Vercel Hobby;
Firebase (Anonymous Auth, Firestore, Realtime Database) on Spark; Vercel
Blob for photos. Not yet scaffolded. See `docs/ARCHITECTURE.md`.

## Users

- **Players**: guests at a live event, from kids to parents and
  grandparents, on their own phones, standing or sitting in a loud room,
  often one-handed and half-watching the room. Several family members may
  share one phone. They want to jump in within seconds and have fun.
- **Captains**: players promoted to lead a team. Their phone becomes the
  team's buzzer in live games, under time pressure with everyone watching.
- **Admin (Khai)**: the host. Runs the night from a phone, tablet or laptop
  while also hosting, talking and moving around. Needs glanceable status
  and one-tap actions, not constant monitoring.
- **The room**: everyone watching the TV or projector display from across
  the room.

## Product Purpose

Run party games at live events: quick solo mini games (word puzzles, photo
challenges) people play on their own phones at their own pace, and live
host-run games (Jeopardy-style buzzer rounds) the whole room plays
together. Points add up to individual and team leaderboards shown live on
the big screen. Success is a room that is laughing, competing and watching
the screen, with zero setup friction for guests.

## Positioning

One host-owned platform that combines async mini games and live game-show
moments in the same event, reskinned per event (a holiday version, a club
version) without changing game code, with a permanent library of every
event the host has run.

## Operating Context

- Joined by scanning a QR code on a poster or the TV. No app install, no
  account; type a name and play.
- Venue Wi-Fi or cellular, possibly flaky.
- First event: Wushu (Chinese martial arts) club holiday party,
  2026-12-19, about 50 players including kids. Future events up to 100.
- Three surfaces: player phone, admin controls, TV display.
- Events have an individual phase and a team phase; captains create teams,
  players join and can donate points.

## Capabilities and Constraints

- Highly configurable per event: join policy, scoring mode, phases, themes,
  game visibility and codes are all set per event.
- Must run free: Firebase Spark and Vercel Hobby limits apply.
- Every surface reads semantic theme tokens so events and games can be
  reskinned (holiday variant, color modes). Controls use a fixed neutral
  theme; player and display surfaces use the event's theme.
- Phones at 375 px wide; display at 1920 × 1080 readable from 5 m; controls
  usable on a phone.
- Terminology is fixed in `docs/GLOSSARY.md`.
- Each event picks its own style pack for phones and TV; admin screens
  share one standard look (ADR-021).
- First style pack: Judges' Table, winter variant, for the holiday party.

## Brand Commitments

- Name: Game Master.
- Khai's direction: fun and playful, never generic or "AI-looking".
- No mock or placeholder content presented as real.

## Evidence on Hand

None yet. No logo, photography or brand assets exist. Do not fabricate
testimonials, stats or photos.

## Product Principles

1. Seconds to fun: scan, type a name, play. Every extra step loses a guest.
2. The room is the audience: the display is a stage, built to be watched.
3. Host never babysits: nothing depends on the admin watching constantly.
4. Fair and visible: scores, buzz order and judging are clear to everyone.
5. Reskin, don't rebuild: looks change per event; game logic doesn't.

## Accessibility & Inclusion

- Mixed ages, kids to grandparents: large type, plain words, big targets.
- Color is never the only signal (game tiles, team identity, right/wrong).
- Respect reduced motion; no sound on phones.
- Display legible from across a room in dim party lighting.
