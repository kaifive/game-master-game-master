# Glossary

Use these words exactly, in code and docs. Add a term here before using a new one.

| Term | Meaning | In code |
|------|---------|---------|
| **Event** | One occasion Khai runs, such as the 2026 Wushu holiday party. Has a slug, a theme and a list of games. | `Event`, `event.slug` |
| **Slug** | The short URL name of an event, such as `holiday-2026`. | `slug` |
| **Library** | The list of every event, past and upcoming, at `/`. | |
| **Device** | A browser with a lasting Firebase anonymous uid. Can hold several players per event. | `deviceUid` |
| **Player** | A person in one event. Lives on one device; a device can hold several (parent and kids). Not a global account. | `Player`, `playerId` |
| **Switch player** | Changing which player a shared device is acting as. | |
| **Nickname** | The name a player shows in an event. Unique within the event. | `player.nickname` |
| **Join policy** | How an event admits players: `open` (instant, default) or `approval` (lobby). | `JoinPolicy` |
| **Join code** | Short code on the QR poster and display, needed to join an event. | `joinCode` |
| **Code** | Any 5-character code a player can enter or scan: an event's join code or a game code. | `code` |
| **Game code** | A code tied to one game, which either opens it (`open`) or reveals it (`unlock`). | `GameCode` |
| **Unlock** | Revealing a hidden or locked game with a code, for one player or the whole event. | `unlocks/` |
| **Quick game** | An event with a single game, whose code opens the game directly. | `kind: "quick"` |
| **Name filter** | The check that rejects inappropriate nicknames and team names as they are typed. | `checkNickname()`, `isBlockedName()` |
| **Ban** | Blocking a device from an event. | `device.banned` |
| **Lobby** | Where players wait for approval under the `approval` policy. | |
| **Scoring mode** | Whether an event is `individual`, `team` or `both`. | `scoring` |
| **Phase** | In a `both` event, whether it is in the `individual` or `team` phase. Admin switches it. | `event.phase` |
| **Team** | A group of players, created by its captain in the team phase. | `Team` |
| **Captain** | A player the admin promotes to lead a team. Also called team leader. Names the team and buzzes for it. | `team.captainId` |
| **Team score** | Members' points + donations to the team + team awards. | |
| **Donation** | A player giving some of their points to a team, with or without joining it. A ledger transfer. | `kind: "donation"` |
| **Game type** | A generic, reusable game, such as `trivia` or `jeopardy`. Code, not content. | `GameType` |
| **Game** | An instance of a game type in one event: type + content + theme variant + scoring. | `Game` |
| **Solo game** | A game a player plays alone at their own pace. Also called a mini game. | `mode: "solo"` |
| **Live session** | A game the admin runs for the whole room at once, such as Jeopardy. | `LiveSession` |
| **Round** | One question or prompt inside a live session. Opened, buzzed, judged, closed. | `Round` |
| **Buzz** | A captain pressing the buzzer during an open round. Stamped with server time. | `Buzz` |
| **Judge** | The admin marking a buzz right or wrong. | `judge()` |
| **Result** | The finished outcome of one player's solo game. One scored result per player per game. | `GameResult` |
| **Award** | One grant of points, to a player or a team. Always a ledger entry. | `Award` |
| **Ledger** | The append-only list of every award, donation and void. Source of truth for points. | `ledger` |
| **Void** | Cancelling an award by adding a reversing entry. Nothing is deleted. | `voidAward()` |
| **Total** | A player's or team's points, derived from the ledger. | `total` |
| **Leaderboard** | Ranked totals, kept as a summary for live screens. | `LeaderboardSummary` |
| **Photo** | A picture a player uploaded in an event. File in Vercel Blob, record in Firestore. | `Photo` |
| **Photo challenge** | A solo game type that asks for a photo of something; points on approval. | `type: "photo-challenge"` |
| **Triage** | The admin swiping through pending photos: right to approve, left to hide. | `/admin/[event]/photos` |
| **Photo vote** | Approved photos for one prompt sent to every player to vote for the best. | `/[event]/vote/[game]` |
| **Recap** | Final standings and approved photos of an event. Admin only. | `/admin/[event]/recap` |
| **Moment** | Something worth celebrating on the display (a lead change, a game finished). Written by the server. | `moments/{slug}` |
| **Toast chain** | The stack of small, auto-expiring toasts on the display for frequent moments. | `<ToastChain>` |
| **Stage** | The lane for big, rare moments: one at a time, full celebration. Small moments go to the toast chain. | `laneFor()` |
| **Celebration** | The animation and sound played for a moment or a finished game. | `celebrate()` |
| **Presence** | Whether a player is connected right now. | `presence` |
| **Controls** | The admin's page for running an event. | `/admin/[event]` |
| **Display** | The read-only big-screen page for the room. | `/[event]/display` |
| **Style pack** | A complete look an event can pick: tokens, fonts, slot skins, icons, motion presets. Applies to the player client and TV. | `StylePack`, `style.pack` |
| **Slot** | A generic component name, such as `ScoreCard` or `Tile`, with one props contract and a default. A style pack may supply its own version. | `useSlots()` |
| **Theme** | The resolved look on screen: a style pack + variant + color mode. The admin layer has its own fixed theme. | `Theme` |
| **Variant** | A named override on top of a style pack, such as `holiday`. | `style.variant` |
| **StyleRoot** | The root of every player and TV page: applies the event's pack, variant and color mode and provides its slots. | `<StyleRoot>` |
| **AdminRoot** | The root of every admin page: the fixed admin theme and default slots. | `<AdminRoot>` |
| **Admin layer** | Library, sign-in, controls, triage and recap. One standard look for every event. | |
| **Color mode** | Light or dark within a theme. | `colorMode` |
| **Renderer** | The React view of a game type. Uses theme tokens only. | `Renderer.tsx` |
| **Logic** | The pure functions of a game type: create, apply move, is over, score. | `logic.ts` |
| **Play** | One player's single run at one solo game. Server-owned; scored once when it ends. | `PlayRecord`, `plays/{gameId}_{playerId}` |
| **Instructions box** | The rules shown before a game starts; the play begins when it is closed. | `Instructions` |
