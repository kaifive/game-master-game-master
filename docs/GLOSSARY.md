# Glossary

Use these words exactly, in code and docs. Add a term here before using a new one.

| Term | Meaning | In code |
|------|---------|---------|
| **Event** | One occasion Khai runs, such as the 2026 Wushu holiday party. Has a slug, a theme and a list of games. | `Event`, `event.slug` |
| **Slug** | The short URL name of an event, such as `winter-2026`. | `slug` |
| **Library** | The list of every event, past and upcoming, at `/`. | |
| **Player** | A person in one event, tied to one device. Not a global account. | `Player` |
| **Nickname** | The name a player shows in an event. Unique within the event. | `player.nickname` |
| **Device identity** | The Firebase anonymous uid a browser keeps. One device can be one player per event. | `uid` |
| **Join policy** | How an event admits players: `open`, `approval` or `roster`. | `JoinPolicy` |
| **Lobby** | Where players wait for approval under the `approval` policy. | |
| **Team** | A group of players in an event. Points can go to a team. | `Team` |
| **Captain** | The player whose phone buzzes for their team in a live session. Promoted by the admin. | `team.captainId` |
| **Game type** | A generic, reusable game, such as `word-guess` or `jeopardy`. Code, not content. | `GameType` |
| **Game** | An instance of a game type in one event: type + content + theme variant + scoring. | `Game` |
| **Solo game** | A game a player plays alone at their own pace. Also called a mini game. | `mode: "solo"` |
| **Live session** | A game the admin runs for the whole room at once, such as Jeopardy. | `LiveSession` |
| **Round** | One question or prompt inside a live session. Opened, buzzed, judged, closed. | `Round` |
| **Buzz** | A captain pressing the buzzer during an open round. Stamped with server time. | `Buzz` |
| **Judge** | The admin marking a buzz right or wrong. | `judge()` |
| **Result** | The finished outcome of one player's solo game. One scored result per player per game. | `GameResult` |
| **Award** | One grant of points, to a player or a team. Always a ledger entry. | `Award` |
| **Ledger** | The append-only list of every award. Source of truth for points. | `ledger` |
| **Void** | Cancelling an award by adding a reversing entry. Nothing is deleted. | `voidAward()` |
| **Total** | A player's or team's points, derived from the ledger. | `total` |
| **Leaderboard** | Ranked totals, kept as a summary for live screens. | `LeaderboardSummary` |
| **Presence** | Whether a player is connected right now. | `presence` |
| **Controls** | The admin's page for running an event. | `/admin/[event]` |
| **Display** | The read-only big-screen page for the room. | `/[event]/display` |
| **Theme** | The look of an event or game: color tokens, color mode, icon set, decorations. | `Theme` |
| **Variant** | A named version of a theme, such as `holiday`. | `theme.variant` |
| **Color mode** | Light or dark within a theme. | `colorMode` |
| **Renderer** | The React view of a game type. Uses theme tokens only. | `Renderer.tsx` |
| **Logic** | The pure functions of a game type: create, apply move, is over, score. | `logic.ts` |
