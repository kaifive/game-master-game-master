# Open questions

Questions for Khai. Non-blocking ones proceed on the stated default.
Move answered ones to the bottom with the answer.

## Open

| # | Question | Blocks | Default until answered |
|---|----------|--------|------------------------|
| Q1 | What is the exact date of the holiday party? | Backlog timing | Assume Sat 2026-12-05; M4 done by 2026-11-30 |
| Q2 | Join policy for the party: `approval` (tap to admit each player), `roster` (players claim a name from a list you upload) or `open`? | Spec 02 | `approval` |
| Q3 | Do solo game points go to the player, their team, or both? | Spec 04 | Both: player total, and team total is the sum of its players' solo points plus team awards |
| Q4 | Can players switch teams after joining? | Spec 03 | Only the admin can move a player once points exist |
| Q5 | Are teams fixed in the event file, or created by the admin on the night? | Spec 03 | Admin can do either; event file may list starting teams |
| Q6 | Which solo games for the party, beyond a word-guess game? | Spec 10+ | Word guess first; pick the second after it ships |
| Q7 | Is Jeopardy the only live session type for the party? | Spec 11, 12 | Yes |
| Q8 | Should players see the full leaderboard on their phones, or only their own rank and team? | Spec 05 | Top 10 plus own rank, refreshed every 15 s (not live) to save bandwidth |
| Q9 | Sound on the display (buzz sound, correct or wrong stings)? | Spec 05, 12 | Yes on display, off on phones |
| Q10 | Should every photo need your approval before anyone else sees it? Matters if kids are at the party. | Spec 13 | Yes, all photos start hidden until approved |
| Q11 | Who can see the recap after the event: anyone with the link, or only you? | Spec 13 | Anyone with the event link sees approved photos |
| Q12 | Should players be able to delete their own photos? | Spec 13 | Yes, until the event ends |

## Answered

| # | Question | Answer |
|---|----------|--------|
| A1 | Player accounts? | No accounts; join with a nickname. Guard against duplicate accounts. |
| A2 | Stack? | Same as Wushu Toolkit, free to run. |
| A3 | Admins? | Only Khai; a shared login is fine. |
| A4 | Big screen? | Yes: separate Display and Controls. |
| A5 | First event and size? | Wushu holiday party, about a month out, about 50 players. |
| A6 | Domain? | None; use the Vercel domain and QR codes. |
