# 10: Trivia (first solo game)

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 09

## Summary

A multiple-choice quiz on the player's phone: a question, a few answers, a timer. Generic over its questions, so every event can bring its own (wushu, the club, the holidays). The party starts with placeholder questions; Khai swaps in real ones later. Replaces word guess, which Khai doesn't want (Q6).

## Behavior

1. Content (`lib/games/trivia/content.ts`): a **pool** of `questions` (1–200), `questionsPerPlay` (default 5) and `secondsPerQuestion` (5–60, default 15). A question is `{ id, prompt, image?, choices (2–6), answer }`; a choice is text, an image, or both. Images are `{ src, alt }`, from `public/` (a path starting with `/`) or an `https://` URL, and always have alt text.
2. Each play draws `questionsPerPlay` different questions from the pool, in an order and with answer orders shuffled from the play's seed, so neighbours get different questions and replays of the party can't be memorized.
3. One question at a time with a countdown. Tapping an answer locks it in. The server checks it and shows right or wrong and the correct answer, then **Next** (on the last question, **See score**).
4. Time runs on the server: a question's deadline is set when it is shown. An answer after the deadline (plus 2 s grace for the network) counts as wrong, and so does running out of time. Leaving and coming back doesn't stop the clock.
5. Points: `round(soloGamePoints × correct ÷ questionsPerPlay)`.
6. Answers show as a **2×2 grid** when there are at most 4 and each is short (16 characters or fewer) or a picture; otherwise as a **list**.
7. The result screen shows correct out of total, and the points counting up (spec 08).
8. Instructions (default): "5 quick questions. You have 15 seconds for each. Tap an answer to lock it in. Points for every right answer." built from the content's numbers.

## Data

The play's `state`: the drawn question ids, choice order per question, the current question, its deadline, each answer given (choice and whether it was right), and the step counter.

## UI

- Question card: "Question 3 of 5", the prompt in the pack's display font, its image if any, answers as large buttons (at least 56 px tall) in a grid or list, and a draining timer bar with the seconds left (red for the last 5).
- After an answer: the chosen answer marked right or wrong (✓ and ✗ as well as color), the correct one marked, and **Next**. "Time's up" if none was chosen. No sound.
- Result: points counting up, "4 of 5 right", back to the hub.

## Acceptance criteria

- [x] AC-1: Trivia content is validated: 1–200 questions with unique ids, 2–6 choices each, every choice text or an image with alt text, an answer that points at a real choice, and `questionsPerPlay` no larger than the pool.
- [x] AC-2: The phone gets the prompt and choices but never the answer before it has answered that question.
- [x] AC-3: Each play draws `questionsPerPlay` different questions from the pool and shuffles answer order, both from the play's seed, and both stay the same on resume.
- [x] AC-4: An answer is checked on the server and the reply shows whether it was right and which choice was correct.
- [x] AC-5: An answer after the deadline plus 2 s, or no answer in time, counts as wrong, and the timer keeps running while the player is away.
- [x] AC-6: Points are `round(soloGamePoints × correct ÷ questionsPerPlay)`, and the result shows correct out of total.
- [x] AC-7: The party's event file has a trivia game with a placeholder pool, and word guess is gone from it.
- [x] AC-8: Answers show as a 2×2 grid when there are at most 4 short or picture answers, and as a list otherwise.
- [x] AC-9: Questions and answers can show images, each with alt text.

## Tests

- Unit: `logic.test.ts` (every rule, fake clock and seed), `content.test.ts`.
- Component: question, answered and result states; timer bar.
- E2E: in `e2e/trivia.spec.ts`, as part of spec 08's flow.

## Out of scope

- Real party questions (Khai adds them later).
- Speed bonus, streaks.
- Live trivia on the TV (that's Jeopardy, spec 12).

## Open questions

- None open.
