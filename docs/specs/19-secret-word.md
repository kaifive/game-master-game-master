# 19: Secret Word

**Status:** Done
**Backlog:** M2
**Depends on:** 08, 09

## Summary

A five-letter word puzzle on the phone: guess the secret word in six tries, with each letter marked after a guess. It's a classic word-guessing mechanic, built in the event's own style (the Judges' Table pack's gold, white-with-a-red-corner and frosted tiles), not a copy of any app. The answers come from the event file, so each event picks its own theme. At the Wushu Holiday Party every answer is a wushu word, which the instructions don't reveal (Khai, 2026-11-13). Fewer guesses score more.

## Behavior

1. Content: `answers`, a list of five-letter words (A–Z, at least one), and `maxGuesses` (default 6). Each play draws one answer from the play's seed, so replays and neighbours get different words.
2. A guess is five letters and must be a real English word (a 12,578-word list on the server only, from the MIT-licensed `word-list` package) or one of the event's answers (so a word like TAOLU can be guessed). A guess that isn't a word doesn't use up a try: the phone says "Not in the word list" and keeps the letters.
3. After each guess, each letter is marked: **correct** (right letter, right spot), **present** (in the word, wrong spot) or **absent**. Repeated letters are marked the standard way: right spots first, then as many "present" as the answer still holds.
4. The run ends when the word is guessed or the tries run out. The phone's keyboard colours each letter by its best mark so far.
5. Points: solved in 1 or 2 guesses earns all of them; 3 earns 90%, 4 earns 75%, 5 earns 60%, 6 earns 45%; not solved earns 0.
6. The result shows how many guesses it took. In a replayable event an unsolved run doesn't show the answer (S08: no answers in replayable games); otherwise it does.
7. Instructions: "Guess the secret 5-letter word in 6 tries. Each guess must be a real word. Gold: right letter, right spot. White with a red corner: in the word, wrong spot. Dark: not in the word. The fewer guesses, the more points." Nothing about the theme.

## Data

Play `state`: the answer, the guesses, the last rejected guess, the phase and the step. The word list is `lib/games/word/dictionary.ts` (server only; the server passes a word check to the game, so phones never download it).

## UI

Phone: six rows of five tiles (the pack's Tile slot), the row being typed shows its letters, and an on-screen keyboard (the pack's Key slot) with **Enter** and **⌫** (labelled "Delete"); a physical keyboard works too. "Not in the word list" shows above the grid without losing the typed letters.

## Acceptance criteria

- [x] AC-1: Answers are validated as five-letter words; each play draws one from its seed.
- [x] AC-2: A guess must be five letters and a real word (or an answer); anything else is turned away without using a try.
- [x] AC-3: Each guess is marked correct, present or absent, with repeated letters handled the standard way.
- [x] AC-4: Points by guesses: 1–2 all, 3 90%, 4 75%, 5 60%, 6 45%, unsolved 0; a replayable event never shows an unsolved answer.
- [x] AC-5: The instructions say nothing about the theme, and the party's event file has a Secret Word game with wushu answers that plays end to end on a phone.

## Tests

- Unit: `lib/games/word/logic.test.ts` (draws, marks, scoring, rejections), the dictionary.
- Component: typing, the keyboard's colours, the rejection message.
- E2E: one solved run on a phone.

## Out of scope

- A daily word shared by everyone; streaks.
