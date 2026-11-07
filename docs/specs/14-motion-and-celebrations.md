# 14: Motion and celebrations

**Status:** Done
**Backlog:** M0 (primitives), then each feature uses them
**Depends on:** 09

## Summary

Smooth, fun motion everywhere a score, rank or result changes, and
celebrations when something good happens. Built once as shared
primitives (ADR-018) so every screen moves the same way, themed per event
(the holiday variant can swap confetti for snowflakes).

## Moments

| Moment | Phone | Display |
|--------|-------|---------|
| Solo game finished | Confetti burst, score counts up, "+100" floats up | Small toast in the toast chain: "Mai finished Daily Word +100" |
| Points awarded (any source) | Own total counts up | Bar grows, row glides to its new rank |
| Rank or lead change | "You moved up to 3rd" toast | Rows swap with a glide; "Team Dragon takes the lead!" callout |
| Buzz in | Buzzer press squish and vibration (captain) | Team name slams in, pulse, buzz sound |
| Judged right | Team flash in team color | Big confetti, score counts up |
| Judged wrong | Gentle shake | Shake and a buzzer sound; next team highlighted |
| Phase change to teams | Full-screen transition to team picking | Stage transition with title card |
| Team created or joined | Team chip pops into place | Team appears on the board |
| Big donation | "Thank you" burst | Points stream from player to team bar |
| Photo vote winner | Winner reveal | Drumroll, then spotlight on the photo, confetti |
| Final standings | Your final rank, celebration if top 3 | Podium reveal, from 3rd to 1st |

## Behavior

- Motion timing comes from tokens every pack defines: `motion-fast`,
  `motion-base`, `motion-slow`, `motion-stage`, `ease-out`, `ease-emphasized`.
- Primitives in `lib/motion` (pure math and the moment queue) and
  `components/motion` (React): `useFlip`, `CountUp`, `BarRace`,
  `PointsBurst`, `ToastChain`, and `celebrate()`.
- A new **`Celebration` slot** plays a moment. The default plays a short,
  token-colored confetti burst; a pack can supply its own (Judges' Table:
  score cards flip up and the snow drifts). Sound stays out of this spec
  (display sound is decided in specs 05 and 12).
- Moments have two lanes on the display: the **toast chain** for small,
  frequent moments and the **stage** for big ones. Stage moments queue so
  two never overlap; toasts pause while one plays.
- Confetti uses `canvas-confetti` (ADR-018), loaded only when a
  celebration first fires.
- Everything has a reduced-motion version.

## Acceptance criteria

- [x] AC-1: Every pack and the admin theme define every motion token; a missing one fails the tests.
- [x] AC-2: When a list reorders, `useFlip` moves each item from its old position to its new one, so rows glide instead of jumping.
- [x] AC-3: `CountUp` rolls a number from its old value to its new one over the token duration and always ends on the exact value.
- [x] AC-4: `BarRace` sizes each bar by its share of the top score, glides rows to their new rank and counts scores up, and reads to screen readers as a ranked list.
- [x] AC-5: `PointsBurst` floats "+N" up from where points were earned, announces the points once to screen readers, and removes itself when done.
- [x] AC-6: `ToastChain` shows at most 4 toasts, newest on top, each for about 5 seconds; extras wait their turn, and the chain pauses while a stage moment plays.
- [x] AC-7: Stage moments play one at a time, in the order they arrived; a moment that arrives during another waits for it.
- [x] AC-8: The `Celebration` slot has a contract suite; the default and Judges' Table's version both pass it, and each moment kind plays its pack's animation.
- [x] AC-9: The confetti library is not in any page's first download; it loads when the first celebration fires, uses theme colors, and fires fewer particles on phones than on the TV.
- [x] AC-10: With reduced motion on, rows snap or fade instead of gliding, numbers jump to their final value, and no confetti, flips or shakes play.
- [x] AC-11: A `/dev/ui/motion` gallery page replays every primitive and every moment in every pack, variant and mode.
- [x] AC-12: A score card flips up when a score lands (a fresh result, or a score that changed since that card was last seen, even on an earlier page), not every time it is shown again.

## How it's built

- Pure logic: `lib/motion` (moment kinds and lanes, count-up math, FLIP deltas, bar shares, the toast-chain and stage reducers).
- Motion tokens are part of the theme contract (`lib/themes/model.ts`); `useMotion()` reads them, `useReducedMotion()` follows the device setting.
- Primitives: `components/motion` (`useFlip`, `CountUp`, `BarRace`, `PointsBurst`, `MomentsProvider`, `ToastChainView`, `MomentsStage`, `fireConfetti`).
- `Celebration` slot: default in `components/slots/defaults/celebration.tsx` (confetti, shake or callout per moment); Judges' Table's in `components/packs/judges-table/slots.tsx` (score-card flip, snow drift, shake or callout).
- Bar labels pick black or white per team color (`readableInk`), tested to 4.5:1 in every pack.
- Gallery: `/dev/ui/motion`.

## Tests

Unit tests for the queue, the count-up math and FLIP deltas (time injected, no real timers); component tests with mocked layout and the Web Animations API; the `Celebration` contract suite; a reduced-motion run of every primitive; a build test for AC-9; an e2e test of the motion gallery.

## Out of scope

Sound on the display (specs 05 and 12); the live session and photo-winner screens that trigger stage moments (specs 05, 12, 13).
