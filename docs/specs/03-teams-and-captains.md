# 03: Teams, phases and captains

**Status:** Done
**Backlog:** M1
**Depends on:** 02, 04, 07

## Summary

Two competitions in one event (ADR-030): **individual** (solo games on your own phone) and **team** (team games played on the captain's phone, like one player). Team points never change anyone's individual score. Players can **donate** their own points to a team. At the end of the night the top player and the top team each win a prize.

## Behavior

### Phases

1. An event's `scoring` is `individual`, `team` or `both` (event file). A `both` event starts in the **individual phase**; a `team` event starts in the team phase.
2. In Controls the host switches to the **team phase** (with a confirm) and can switch back if pressed by mistake. Phones show the change within 15 seconds.
3. Solo games stay open in the team phase and still earn individual points.

### Teams and captains

4. In Controls the host makes a player a **captain**. That creates their team with the next team color, and the captain is its first member.
5. The captain's phone asks them to **name the team**: 2–20 characters, the same characters and name filter as nicknames (spec 02), unique per event. Until named, it shows as "Team <captain's name>".
6. The host sets a **maximum team size** in Controls (suggested: active players ÷ teams, rounded up). Once a team is full, nobody else can join it.
7. Teams live on the **Team** tab (`/[event]/team`); the games list nudges there when teams open or a new captain needs to name their team. In the team phase, a player who isn't on a team sees **Pick your team** on the Team tab: every team with its name, color, captain, members and room left. Joining takes one tap and a confirm ("You can't switch later"). Players can't leave or switch; the host can **move** them.
8. The host can **change a team's captain** to another member, for example if the captain leaves. A team with no captain (its captain was removed) can't play team games until it has one.
9. Captains can't start over (ADR-027).

### Team games and team points

10. A game for teams is one with `phase: "team"` in the event file. Only a captain can play it, on their phone, for their team, and only in the team phase. In the game list other members see "Captain plays" (then "Team · +N" once it's played), and opening it says "Your captain plays this one for the team." It plays and scores exactly like a solo game, with the team as the player: one play per team (or replays if the event allows), and the best run counts. The party's placeholder is **Team Trivia**.
11. Team awards go to the team in the ledger (spec 04); they never change a player's points.

### Donations

12. In the team phase, any player can **donate** any whole number of their own points, up to what they have, to any team, from the team panel with a confirm ("Give 25 of your points to Cranes? Your score goes down by 25. You can't undo this."). It's two ledger entries in one transaction: a deduction from the player and an award to the team, so the player's individual score goes down. Not once the event has ended.
13. A player can't undo a donation. The host can void it from Controls (both entries): the Donations card loads the list on request, since each donation costs a read.
14. A player who starts over forfeits their points, and their donations are voided from the teams they went to (ADR-027).

### Leaderboards

15. **Team score** = team awards + donations received.
16. **Phone** in the team phase: your team's rank and score above the player leaderboard, and a team list.
17. **TV** in the team phase: team standings as racing bars in team colors, with the top 5 players beside them. Toasts for team awards and donations ("Mai gave 50 to Team Dragon"), and a callout when a team takes the lead.
18. **Ended event:** final standings show the top team and the top player first.

## Data

- `events/{slug}`: `phase`, `maxTeamSize`.
- `events/{slug}/teams/{teamId}`: `name | null`, `nameKey`, `color`, `captainId | null`, `memberIds`, `points`, `createdAt`.
- `events/{slug}/players/{playerId}.teamId`.
- Ledger entries `to: { kind: "team", id }`; donations also have `from: { kind: "player", id }` and `source.kind: "donation"`.
- Plays of team games are keyed by team id: `plays/{gameId}_{teamId}`.
- Leaderboard summary `teams/{teamId}: { name, color, points }`.
- `teams/{slug}` in the Realtime Database: what phones see of teams, rewritten after every team change (ADR-031). Phones, the leaderboard, the TV and team games read this, never Firestore.

## Routes

- `GET /api/events/[slug]/teams?playerId=`: public; the summary and that player's team.
- `POST /api/events/[slug]/teams` (device token): `{ action: "join", playerId, teamId }`, `{ action: "name", playerId, name }`, or `{ action: "donate", playerId, teamId, points }`.
- `GET /leaderboard` adds `phase`, ranked `teams` and `myTeam`; `GET /display` adds `phase` and `teams`.
- Controls actions: `phase`, `teamSize`, `captain`, `moveTeam`, `setCaptain`, `donations`, `voidDonation`.

## Acceptance criteria

- [x] AC-1: A `both` event starts in the individual phase; the host can switch to the team phase and back, with a confirm, and phones follow.
- [x] AC-2: Making a player a captain creates their team with the next color; the captain names it (filtered, unique, 2–20 characters).
- [x] AC-3: In the team phase, a player without a team sees every team and joins one in a tap with a confirm; full teams can't be joined, and players can't switch.
- [x] AC-4: The host sets the maximum team size, moves players between teams, and changes a team's captain.
- [x] AC-5: Only a captain can play a team game, for their team, and its points go to the team, never to a player.
- [x] AC-6: A donation moves whole points from a player to a team in one transaction, up to the player's points; the host can void it.
- [x] AC-7: Starting over voids the player's donations from teams.
- [x] AC-8: Team score is team awards plus donations, and the phone and TV show team standings in the team phase.
- [x] AC-9: The memory and Firebase team repos pass the same contract, including two players racing for a team's last spot.

## Tests

- Unit: team rules, the teams, donation and team-game services with memory repos.
- Contract: `lib/teams/repo.contract.ts` against memory and the emulators.
- E2E: switch to the team phase, make captains, name a team, join, donate, a captain plays a team game, team bars on the TV.

## Out of scope

- Team photo challenges (spec 13) and Jeopardy buzzing (spec 12), which build on captains.
- Teams formed before the event.

## Open questions

- None open. Decided in ADR-030.
