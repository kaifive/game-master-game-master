# Game library

Every game type that's been built (spec 23). Made from `lib/games/catalog.ts` by
`npm run games:doc`; don't edit by hand. To use a game at an event, add it to the
event's file in `content/events/` with its type id.

| Game | Type id | What it is |
| ---- | ------- | ---------- |
| Auction | `auction` | Showdown: bid your numbers 1 to 10, each once a game; tied bids cancel, highest wins. |
| Blind Stop | `blindstop` | Showdown: stop a clock at exactly 10.00 after it hides behind a question mark. |
| Block Fit | `blocks` | Drag and turn pieces to fill a board exactly; can rebuild a photo. |
| Color Count | `colorcount` | Showdown: ornaments flash on the TV, then it asks how many of one color there were. |
| Color Matcher | `color` | Pick a color from memory on a color wheel; the closer, the more points. |
| Fly-by Count | `flyby` | Showdown: presents fly across the TV and teams count them; exact scores 100. |
| Geocache | `cache` | Find codes hidden around the venue and type them in for points. |
| Guessing Jar | `jar` | One guess at how many things are in a real jar; the host reveals the count. |
| Land Mass | `landmass` | Showdown: teams take turns placing block pieces on one board; the most land wins. |
| Last Second | `lastsecond` | Showdown: stop a countdown as late as you dare; hit zero and you get nothing. |
| Memory Path | `path` | Showdown: a path lights up and hides; teams take turns crossing it from memory. |
| Pathfinder | `trail` | Draw one path through every square, hitting the numbers in order; can have a runner picture. |
| Photo Challenge | `photo-challenge` | Take a photo to a prompt, like Spot and Snipe; the host rates it. |
| Picture Slide | `slide` | The classic sliding tile puzzle, with numbers or a sliced-up picture. |
| Present Shuffle | `shuffle` | Showdown: presents show their points, then shuffle; teams take turns picking one. |
| Quick Draw | `draw` | Draw a shape from memory, such as a logo; a judge scores how close it is. |
| Rapid Recall | `recall` | Remember which squares lit up, over rounds that get bigger. |
| Secret Word | `word` | Guess a hidden 5-letter word in 6 tries, with colored tiles as clues. |
| Share or Snatch | `snatch` | Showdown: two teams, one pot; both share and split it, one snatches and takes it all. |
| Snow Sum | `snowsum` | Showdown: snowflakes marked +3, -2 or x2 fall one at a time; teams keep the total. |
| Snowball to 21 | `to21` | Showdown: teams take turns adding 1, 2 or 3; whoever makes exactly 21 wins. |
| Stack Attack | `stacker` | Tap to drop a sliding row and stack it as high as you can; overhangs get chopped. |
| Stocking Stuffer | `stockings` | Showdown: open another stocking for points or bank them; coal loses the round's haul. |
| T-Timer | `timer` | Stop a running clock inside a tiny target window, like 1.20 to 1.25 seconds. |
| Tap Masher | `taps` | Tap as fast as you can for a few seconds; can play a video one frame per tap. |
| Trivia | `trivia` | Multiple-choice questions against the clock; faster right answers score more. |
