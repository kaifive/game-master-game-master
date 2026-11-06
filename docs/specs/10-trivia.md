# 10: Trivia (first solo game)

**Status:** Draft
**Backlog:** M2
**Depends on:** 08, 09

## Summary

A multiple-choice quiz on the player's phone: a question, a few answers, a timer. Generic over its questions, so every event can bring its own (wushu, the club, the holidays). The party starts with placeholder questions; Khai swaps in real ones later. Replaces word guess, which Khai doesn't want (Q6).

## Behavior

1. Content (`lib/games/trivia/content.ts`): `questions: { id, prompt, choices: string[2–6], answer: number }[]` (1–30 questions) and `secondsPerQuestion` (5–60, default 20).
2. Everyone gets the same questions in the same order. Each player's answer order is shuffled from the play's seed, so a neighbour's screen doesn't give it away.
3. One question at a time with a countdown. Tapping an answer locks it in. The server checks it and shows right or wrong and the correct answer, then **Next**.
4. Time runs on the server: a question's deadline is set when it is shown. An answer after the deadline (plus 2 s grace for the network) counts as wrong, and so does running out of time. Leaving and coming back doesn't stop the clock.
5. Points: `round(scoring.points × correct ÷ questions)`.
6. The result screen shows correct out of total, and the points as the pack's `ScoreCard`.

## Data

The play's `state`: question order, choice order per question, the current step, its deadline, and each answer given (choice and whether it was right).

## UI

- Question card: "Question 3 of 8", the prompt in the pack's display font, answers as large buttons (at least 56 px tall, full width), a `Progress` bar for time.
- After an answer: the chosen button marked right or wrong, the correct one marked, and **Next**. No sound.
- Result: score card, "6 of 8 right", back to the hub.

## Acceptance criteria

- [ ] AC-1: Trivia content is validated: 1–30 questions, 2–6 choices each, an answer that points at a real choice, unique question ids.
- [ ] AC-2: The phone gets the prompt and choices but never the answer before it has answered that question.
- [ ] AC-3: Choice order is shuffled per player from the play's seed and stays the same on resume.
- [ ] AC-4: An answer is checked on the server and the reply shows whether it was right and which choice was correct.
- [ ] AC-5: An answer after the deadline plus 2 s, or no answer in time, counts as wrong, and the timer keeps running while the player is away.
- [ ] AC-6: Points are `round(points × correct ÷ questions)`, shown on the result screen with correct out of total.
- [ ] AC-7: The party's event file has a trivia game with placeholder questions, and word guess is gone from it.

## Tests

- Unit: `logic.test.ts` (every rule, fake clock and seed), `content.test.ts`.
- Component: question, answered and result states; timer bar.
- E2E: in `e2e/trivia.spec.ts`, as part of spec 08's flow.

## Out of scope

- Real party questions (Khai adds them later).
- Speed bonus, streaks, images in questions.
- Live trivia on the TV (that's Jeopardy, spec 12).

## Open questions

- None open.
