# 12: Buzzer round (and Jeopardy on the same buzzer)

**Status:** Draft (agreed with Khai 2026-11-19; marked Ready in the PR that builds it, since check:ac makes Ready mean its tests exist)
**Backlog:** M3
**Depends on:** 04, 07, 11, 24

## Summary

A host-run quiz round: a question shows on the TV, Khai reads it out and opens
the buzzers, and every team's captain buzzes on their phone. Controls lists the
teams in the order they buzzed, with the answer beside the question in case Khai
forgets. Khai calls on the first team, hears their answer out loud, taps Right
or Wrong, and moves on. Right awards the question's points to the team; Wrong
passes to the next team that buzzed. The buzzer, the buzz order and judging are
built to be reused: Jeopardy (a board of categories and values) comes later on
the same pieces.

## User stories

- As the host, I want to show a question, open the buzzers when I've read it, and see who buzzed first, so I can call on teams out loud.
- As the host, I want the answer in front of me, so I can judge without remembering it.
- As a captain, I want a big buzzer that tells me when it's live and where we came in.
- As the room, I want to see the question and who buzzed first on the TV.

## Behavior

### The round

1. A buzzer round is a live game (spec 11) of type `buzzer` (`mode: "live"`,
   `phase: "team"`), started from Controls like a showdown and shown on the TV's
   Showdown screen (spec 24). Its content is a list of **questions**, each with the
   question text, the answer, and optionally its own points (default: the game's
   `scoring.points`, or 100) and a picture.
2. The questions go in the order written. Controls shows "Question 3 of 12".

### One question

3. **Show.** Khai taps Show question: the TV shows the question big (and its picture).
   Captains' buzzers are **red** with a drawn lock and "Wait…" (Khai, 2026-11-19:
   buzzers open when the host opens them, and go red to green).
4. **Open buzzers.** Khai reads the question, then taps Open buzzers. The TV and
   every buzzer turn **green**, reading "BUZZ!", with a pulse. Each captain can
   buzz once per question. Red and green are never the only signal: the lock and
   "Wait…" or "BUZZ!" always say it too (PRODUCT.md, for color-blind players).
5. **Too early.** As on Jeopardy, pressing a red buzzer locks that phone out for a
   moment: the buzzer shakes, says "Too early!", and can't buzz for 0.25 s from that
   press, even if the buzzers open meanwhile. It costs no points. Mashing early only
   keeps restarting the lockout, so it pays to wait for green. The server keeps each
   team's latest early press and refuses a buzz inside its lockout, so a phone can't
   get round it. The lockout can be changed per event (`earlyLockoutMs`, 0 to 2000,
   default 250).
6. **Fair order.** A buzz is timed on the phone at the moment of the press, on the
   shared server clock (spec 11, S11-AC5), like the Stop games (spec 25), and the
   server checks it's possible by its own clock. The order is by that time, so
   a slower connection doesn't lose a race it won. A press before Open buzzers
   isn't a buzz: it's a too-early press (behavior 5).
7. **Who's first.** Controls lists every team that buzzed, in order, with how long
   after the open they pressed ("+0.42 s"), the first one highlighted. The TV shows
   the first team big ("Snow Dragons!") with the rest in order under it, in their
   colors; each captain's phone shows where their team came in ("You're 1st!",
   "You're 3rd").
8. **Judging.** Khai calls on the highlighted team and hears their answer out loud.
   - **Right:** the team gets the question's points (an award in the ledger,
     spec 04), the TV shows the answer and the points going to the team, and the
     question is done.
   - **Wrong:** no points are lost (Khai, 2026-11-19). The team is marked wrong on
     Controls and the TV, and the next team in the buzz order is highlighted
     (Khai, 2026-11-19: next in buzz order).
   - When every team that buzzed has been judged wrong, Khai can **Reopen buzzers**
     for the teams that haven't buzzed yet, or **Reveal the answer** and move on.
   - Nobody buzzes: Khai taps Reveal the answer.
9. **Undo.** Khai can undo the last Right or Wrong (taking an awarded point back),
   in case of a mis-tap.
10. **Next.** Next question goes on; after the last one, the round ends and the TV
   goes back to the board. Khai can also skip a question, or end the round early.

### The answer

11. Controls always shows the current question's answer, beside the question,
    from the moment it's shown. Phones and the TV never get it until it's revealed
    (Right, or Reveal the answer).

### Phones

12. Only captains buzz (ADR-014). Other members see "Your captain buzzes" with
    their team's place once it has buzzed, and the result.
13. The buzzer is one huge round button (20rem across, like the Stop button,
    spec 25) that fires on press, not release, and vibrates where phones allow:
    red and locked, green and live, then the team's place. No sound on phones
    (PRODUCT.md).

## Jeopardy later (same pieces)

14. Jeopardy (`jeopardy`, still off in the party's event file) will add a board:
    categories across the top and values down, picked by Khai (or by the team
    that last answered right). A picked clue then runs exactly as one question
    above: show, open buzzers, the order, Right or Wrong, the answer on Controls.
    Whether wrong answers lose points there is decided when it's specced; the
    buzzer round's rule is no loss.

## Data

- Content: `questions: { id, prompt, answer, points?, picture? }[]` (1 to 50) and
  `earlyLockoutMs` (default 250), validated in the event file (spec 01).
- Live state (spec 11): the question index; its step (`shown`, `open`, `judging`,
  `done`); when buzzers opened; each team's latest too-early press; the buzzes (team,
  pressed at); each team's result
  for the question (`right` / `wrong`); the awards made, for undo.
- Awards go through the ledger as team awards with the game and question in their
  reason (spec 04), so the board and toasts pick them up.

## Routes and real-time

- Captains buzz through the live move route (spec 11) with the press time; the
  host steps the round through the admin live route: show, open, right, wrong,
  reopen, reveal, undo, next, skip, end.
- Everyone polls the view about every 700 ms (spec 11), so Controls sees a buzz
  within about a second. Views: the TV and phones never carry the answer before
  it's revealed; Controls always does.

## UI

- **TV:** the question in large type (with its picture), a red "Wait…" bar, then
  a green "Buzz now!" bar, then the buzz order: the first team's name big in its color, the
  others in a row under it, wrong ones struck through with a drawn cross; at Right,
  the answer and the team's points held up on a score card.
- **Controls:** the question with its answer under it in a highlighted box; one big
  button for the next step (Show question, Open buzzers, Next question); the buzz
  order as rows (place, team swatch and name, +time) with Right and Wrong on the
  highlighted one; Reopen buzzers, Reveal the answer, Undo, Skip, End round below.
  Works on a phone held in one hand.
- **Captain's phone:** the buzzer fills the screen's width: red with a drawn lock and
  "Wait…"; a shake and "Too early!" when pressed red; green, pulsing, "BUZZ!" when
  open; then the team's color with "You're 2nd!" and the result. Red and green are
  `danger` and `success`, both core tokens, so every pack can set them.

## Edge cases

- Two buzzes at the same millisecond: the server's arrival order breaks the tie.
- A captain reloads or loses signal: their buzz, if sent, stands; they can't buzz twice.
- Khai opens buzzers by mistake before reading: Undo returns to "shown" if nobody has buzzed.
- A team with no captain can't buzz (spec 03).
- A question with no answer text is refused by the event file check.

## Acceptance criteria

- [ ] AC-1: Khai steps each question: show it on the TV, open the buzzers, judge, and go to the next. Buzzers are red with a lock and "Wait…" until opened, then green with "BUZZ!", on the phones and the TV.
- [ ] AC-7: A press while red locks that team out for `earlyLockoutMs` (default 0.25 s) from the press, shown as "Too early!", enforced by the server, and costs no points.
- [ ] AC-2: Buzzes are ordered by the press time on the shared clock, checked by the server; each team buzzes once per question; Controls, the TV and the captain's phone show the order.
- [ ] AC-3: Right awards the question's points to the team through the ledger and reveals the answer; Wrong takes no points and passes to the next team that buzzed; when none are left Khai can reopen for teams that haven't buzzed or reveal the answer.
- [ ] AC-4: Controls always shows the current answer; the TV and phones never get it before it's revealed.
- [ ] AC-5: Khai can undo the last Right or Wrong (taking back its points), skip a question and end the round.
- [ ] AC-6: The buzzer, the order and judging are built as pieces Jeopardy can reuse for a picked clue.

## Tests

- Unit: the round's state machine (every step, wrong passes on, reopen, undo, skip); fair ordering with late arrivals; the early-press lockout, including a press just before opening; views never leak the answer.
- Play tests: spec 24's harness with 1 to 6 teams buzzing at random times, including late and silent teams.
- Component: the buzzer's red, too-early, green and placed states; Controls' question, answer and order with Right and Wrong; the TV at each step.
- E2E: Khai shows a question, opens buzzers, two captains buzz, Khai marks the first Wrong and the second Right, and the board shows the points.

## Out of scope

- The Jeopardy board itself (behavior 14), Final Jeopardy and wagers.
- Typed answers on phones; answers are spoken.
- A timer to answer; Khai runs the pace.

## Open questions

- Q35 in `OPEN_QUESTIONS.md`: the party's questions.
