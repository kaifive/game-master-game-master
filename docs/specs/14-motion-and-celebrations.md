# 14: Motion and celebrations

**Status:** Draft
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

## In scope (first pass)

- Motion tokens per theme: durations, easings, confetti colors and shapes
- Primitives: `useFlip`, `CountUp`, `BarRace`, `PointsBurst`, `Confetti` /
  `celebrate()`, `Reveal`, `Shake`, `Pulse`, plus a points-over-time line
  chart that draws in
- Reduced-motion fallbacks for every primitive
- Display listens to `moments/{slug}` and sorts each into one of two lanes:
  - **Toast chain** for small, frequent moments (a player finished a solo
    game, a small donation, someone joined a team): compact toasts stack in
    a corner, newest on top, each slides in, stays about 5 seconds and
    slides out. At most 4 visible; extras wait their turn. Never covers
    the leaderboard.
  - **Stage** for big, rare moments (lead change, judged right, photo
    winner, phase change, final podium): full celebration, queued so two
    never overlap. Toasts pause during a stage moment.
- Gallery page `/dev/ui/motion` showing each primitive and moment
- Performance: transform and opacity only; confetti particle count lower on phones

## Open questions

- Q9: sound on the display?
- Vibration on captains' phones when they buzz? Default yes, where supported.

## Acceptance criteria

To be written when this spec moves to `Ready`.
