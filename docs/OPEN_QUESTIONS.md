# Open questions

Questions for Khai. Non-blocking ones proceed on the stated default.
Move answered ones to the bottom with the answer.

## Open

| # | Question | Blocks | Default until answered |
|---|----------|--------|------------------------|
| Q7 | Is Jeopardy the only live session type for the party? | Spec 11, 12 | Yes |
| Q16 | Can a captain lead a team without anyone else joining? | Spec 03 | Yes |
| Q17 | Photo vote: can players vote for their own team's photo? | Spec 13 | No |
| Q18 | Automatic photo screening with AI later? Costs roughly $1 per few hundred photos. | ADR-010 | Not for the party |
| Q20 | Can a player use the same unlock code twice, or share it with friends? | Spec 08 | Each player's unlock counts once; sharing a code is allowed (it's a party) |
| Q21 | Should codes expire after the event ends? | Spec 08 | Yes, codes stop working once the event is `ended` |
| Q19 | Where should photo backups go? | Runbook | Google Drive folder `Game Master/<slug>` |

## Answered

| # | Question | Answer |
|---|----------|--------|
| A1 | Player accounts? | No accounts; join with a nickname. |
| A2 | Stack? | Same as Wushu Toolkit, free to run. |
| A3 | Admins? | Only Khai; a shared login is fine. |
| A4 | Big screen? | Yes: separate Display and Controls. |
| A5 | First event and size? | Wushu holiday party, Saturday 2026-12-19, about 50 players. Never more than 100 at once. |
| A6 | Domain? | None; the Vercel domain and QR codes. |
| A7 | Join policy? (was Q2) | No approval for every player; Khai can't watch all night. Instant join with a name filter, join code and kick or ban (ADR-010). Lobby stays an option. |
| A8 | Shared phones? | A parent and kids must be able to play separately on one phone (ADR-009). |
| A9 | Solo or team points? (was Q3) | Events can be individual, team or both, with an individual phase then a team phase. Captains name teams; players join teams; players can donate points to teams (ADR-011). |
| A10 | Switch teams? (was Q4) | Players can't switch themselves; joining must be easy. |
| A11 | Teams fixed in advance? (was Q5) | No; captains create them in the team phase. |
| A12 | Photo approval? (was Q10) | All photos are saved; only approved ones reach players, through a quick swipe triage. Team photos can go to a player vote. |
| A13 | Recap visibility? (was Q11) | Admin only. |
| A14 | Players delete own photos? (was Q12) | No. Once uploaded, only the admin sees or removes it. |
| A16 | Nickname style? (was Q13) | A plain text box; no generated names (ADR-013). |
| A17 | Who controls live games? | Only team captains, since teams have different sizes and phone counts (ADR-014). No max team size. |
| A18 | Code quality bar? | Production grade: test-driven, reusable components, DRY, enforced by tooling (ADR-015, ADR-016). |
| A19 | Game codes? | All of it: codes that jump straight to a game, codes that unlock hidden games (scavenger hunts), and quick single-game sessions, with the code carried in the URL for QR codes (ADR-020). The platform should be highly configurable per event. |
| A20 | Holiday party look? | Judges' Table with a winter variant. Games play in any order; scores must scale past three. |
| A21 | How do event styles plug in? | Generic component slots with defaults; each pack overrides what it needs (ADR-022). |
| A22 | Ended events? (spec 01) | Show final standings; games closed. Photos and recap stay admin-only. |
| A23 | Home page? (spec 01) | An "enter a code" page; the library moves to `/admin`. |
| A24 | Before start? (spec 01) | Players can join early; games unlock at the start (or when opened early). |
| A25 | Party time? (was Q22) | Saturday Dec 19, 4:30 pm Eastern. No automatic start or end: Khai starts and ends it by hand (ADR-024). |
| A15 | Photo storage over time? | Back up and clear photos after each event; checklist reminder before each event (ADR-012). |
| A26 | Solo games for the party? (was Q6) | Trivia with placeholder questions for now; no word guess. Photo challenge and the ornament hunt stay. |
| A27 | Phone leaderboard? (was Q8) | Top 10 plus your own rank. |
| A28 | Sound on the display? (was Q9) | No sound. |
| A29 | Donate to a team you're not on? (was Q14) | Yes. |
| A30 | Solo points in the team phase? (was Q15) | Still go to the player, so they count for their team. |
| A31 | Showing a replay improvement? | A "+10 new best" toast on the TV, and the row slides up. |
