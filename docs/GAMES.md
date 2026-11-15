# Game library

Every game type that's been built (spec 23). Made from `lib/games/catalog.ts` by
`npm run games:doc`; don't edit by hand. To use a game at an event, add it to the
event's file in `content/events/` with its type id.

| Game | Type id | What it is |
| ---- | ------- | ---------- |
| Block Fit | `blocks` | Drag and turn pieces to fill a board exactly; can rebuild a photo. |
| Color Matcher | `color` | Pick a color from memory on a color wheel; the closer, the more points. |
| Geocache | `cache` | Find codes hidden around the venue and type them in for points. |
| Guessing Jar | `jar` | One guess at how many things are in a real jar; the host reveals the count. |
| Pathfinder | `trail` | Draw one path through every square, hitting the numbers in order; can have a runner picture. |
| Photo Challenge | `photo-challenge` | Take a photo to a prompt, like Spot and Snipe; the host rates it. |
| Picture Slide | `slide` | The classic sliding tile puzzle, with numbers or a sliced-up picture. |
| Quick Draw | `draw` | Draw a shape from memory, such as a logo; a judge scores how close it is. |
| Rapid Recall | `recall` | Remember which squares lit up, over rounds that get bigger. |
| Secret Word | `word` | Guess a hidden 5-letter word in 6 tries, with colored tiles as clues. |
| Stack Attack | `stacker` | Tap to drop a sliding row and stack it as high as you can; overhangs get chopped. |
| T-Timer | `timer` | Stop a running clock inside a tiny target window, like 1.20 to 1.25 seconds. |
| Tap Masher | `taps` | Tap as fast as you can for a few seconds; can play a video one frame per tap. |
| Trivia | `trivia` | Multiple-choice questions against the clock; faster right answers score more. |
