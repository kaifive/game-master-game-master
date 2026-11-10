# 10: Trivia (first solo game)

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 09

## Summary

A multiple-choice quiz on the player's phone: a question, a few answers, a timer. Generic over its questions, so every event can bring its own (wushu, the club, the holidays). The party starts with placeholder questions; Khai swaps in real ones later. Replaces word guess, which Khai doesn't want (Q6).

## Behavior

1. Content (`lib/games/trivia/content.ts`): a **pool** of `questions` (1–200), `questionsPerPlay` (default 5) and `secondsPerQuestion` (5–60, default 10). A question is `{ id, prompt, image?, choices (2–6), answer }`; a choice is text, an image, or both. Images are `{ src, alt }`, from `public/` (a path starting with `/`) or an `https://` URL, and always have alt text.
2. Each play draws `questionsPerPlay` different questions from the pool, in an order and with answer orders shuffled from the play's seed, so neighbours get different questions and replays of the party can't be memorized.
3. One question at a time with a countdown. Tapping an answer locks it in. The server checks it and shows right or wrong and the correct answer for 1 second, then the next question (or the score) comes on its own. The phone asks for it as soon as the server confirms the answer and holds it until the pause ends, so it appears as the bar empties; the server starts its clock from that moment (`startIn`). There is no Next button and no tap to skip, so a stray tap can't land on the next question. The wait runs on the phone, so a phone that leaves waits on the answer instead of losing the questions after it.
4. Time runs on the server: a question's deadline is set when it is shown. An answer after the deadline (plus 2 s grace for the network) counts as wrong, and so does running out of time. Leaving and coming back doesn't stop the clock.
5. Points: each question is worth an equal share of `soloGamePoints`. A right answer earns half its share for being right and up to half again for speed (all of it when instant, half at the buzzer). A perfect, instant run earns everything, which gives a reason to replay.
6. Answers show as a **2×2 grid** when there are at most 4 and each is short (16 characters or fewer) or a picture; otherwise as a **list**.
7. The result screen shows correct out of total and the average seconds taken on right answers, and the points counting up (spec 08).
8. Instructions (default): "5 quick questions. You have 10 seconds for each." / "Tap an answer to lock it in. You can't change it." / "The next question starts by itself, a second after each answer." / "Right answers score points. Faster answers score more." built from the content's numbers.

## Data

The play's `state`: the drawn question ids, choice order per question, the current question, its deadline, each answer given (choice and whether it was right), and the step counter.

## UI

- Question card: "Question 3 of 5", the prompt in the pack's display font, its image if any, answers as large buttons (at least 80 px tall) in a grid or list, and a draining timer bar with the seconds left (red for the last 5).
- After an answer: the chosen answer marked right or wrong (✓ and ✗ as well as color), the correct one marked (not in a replayable event, AC-16), and a short line ("Right!", "Not quite.", "Time's up.") smaller than the question. "Time's up" if none was chosen. No sound.
- Result: points counting up, "4 of 5 right · 3.2 s average", Play again in a replayable event.

## Acceptance criteria

- [x] AC-1: Trivia content is validated: 1–200 questions with unique ids, 2–6 choices each, every choice text or an image with alt text, an answer that points at a real choice, and `questionsPerPlay` no larger than the pool.
- [x] AC-2: The phone gets the prompt, the choices and only a scrambled key to the current question's answer (ADR-029); the server still checks every answer and keeps the score.
- [x] AC-3: Each play draws `questionsPerPlay` different questions from the pool and shuffles answer order, both from the play's seed, and both stay the same on resume.
- [x] AC-4: An answer is checked on the server and the reply shows whether it was right and which choice was correct.
- [x] AC-5: An answer after the deadline plus 2 s, or no answer in time, counts as wrong, and the timer keeps running while the player is away.
- [x] AC-6: A right answer earns half its share for being right and up to half for speed (instant earns all, the buzzer half), and the result shows correct out of total and the average time.
- [x] AC-7: The party's event file has a trivia game with a placeholder pool, and word guess is gone from it.
- [x] AC-8: Answers show as a 2×2 grid when there are at most 4 short or picture answers, and as a list otherwise.
- [x] AC-9: Questions and answers can show images, each with alt text.
- [x] AC-15: Each question's clock starts clean, never shows more than its seconds, moves smoothly, and freezes where it is once an answer is tapped.
- [x] AC-14: The next question is requested as soon as the server confirms the answer and shows when the 1-second pause ends, counted from the tap; its clock starts when it shows.
- [x] AC-13: A tapped answer shows right or wrong at once from the question's key, before the server replies (the reply confirms it), the answers lock, and the whole button takes the tap, not just its text.
- [x] AC-12: On a phone, answers are at least 80 px tall and the Start button at least 56 px.
- [x] AC-11: After each answer, a line says what's next ("Question 3 of 5 is next…" or "Your score is next…") over a bar that empties during the pause, and the instructions say the next question starts by itself.
- [x] AC-16: In a replayable event, a wrong answer shows as wrong without marking the right one, so replays can't be learned by heart (Khai, 2026-11-10).
- [x] AC-10: After an answer shows for 1 second, the next question (or the score) comes on its own, once; there is no Next button and a tap doesn't skip ahead.

## Tests

- Unit: `logic.test.ts` (every rule, fake clock and seed), `content.test.ts`.
- Component: question, answered and result states; timer bar.
- E2E: in `e2e/trivia.spec.ts`, as part of spec 08's flow.

## Out of scope

- Real party questions (Khai adds them later).
- Streaks.
- Live trivia on the TV (that's Jeopardy, spec 12).

## Open questions

- None open.
