# Game library

Every game type that's been built (spec 23). Made from `lib/games/catalog.ts` by
`npm run games:doc`; don't edit by hand. To use a game at an event, add it to the
event's file in `content/events/` with its type id.

Modes: `solo` runs on players' phones (`mode: "solo"`), `showdown` on the TV with
captains' phones (`mode: "live"`). A game with both can run either way (ADR-040).

| Game | Type id | Modes | What it is |
| ---- | ------- | ----- | ---------- |
| Auction | `auction` | showdown | bid your numbers 1 to 10, each once a game; tied bids cancel, highest wins. |
| Blind Stop | `blindstop` | showdown | stop a clock at exactly 10.00 after it hides behind a question mark. |
| Block Fit | `blocks` | solo | Drag and turn pieces to fill a board exactly; can rebuild a photo. |
| Color Count | `colorcount` | solo, showdown | Ornaments flash up, then it asks how many of one color there were. |
| Color Matcher | `color` | solo, showdown | Match a color on a color wheel: one from memory solo, or one flashed on the TV as a showdown. |
| Cut the Ribbon | `ribbon` | solo, showdown | Tap where to cut a ribbon, like one third of the way along, with no marks to help. |
| Fly-by Count | `flyby` | solo, showdown | Presents fly past; count them. Exactly right scores full points, one off half. |
| Geocache | `cache` | solo | Find codes hidden around the venue and type them in for points. |
| Guessing Jar | `jar` | solo | One guess at how many things are in a real jar; the host reveals the count. |
| Land Mass | `landmass` | showdown | teams take turns placing block pieces on one board; the most land wins. |
| Last Second | `lastsecond` | showdown | stop a countdown as late as you dare; hit zero and you get nothing. |
| Lion Drum | `liondrum` | solo, showdown | A lion-dance drum flashes a beat, then goes dark; keep tapping in time. |
| Memory Path | `path` | showdown | a path lights up and hides; teams take turns crossing it from memory. |
| Pathfinder | `trail` | solo | Draw one path through every square, hitting the numbers in order; can have a runner picture. |
| Photo Challenge | `photo-challenge` | solo | Take a photo to a prompt, like Spot and Snipe; the host rates it. |
| Picture Slide | `slide` | solo | The classic sliding tile puzzle, with numbers or a sliced-up picture. |
| Present Shuffle | `shuffle` | showdown | presents show their points, then shuffle; teams take turns picking one. |
| Quick Draw | `draw` | solo | Draw a shape from memory, such as a logo; a judge scores how close it is. |
| Rapid Recall | `recall` | solo | Remember which squares lit up, over rounds that get bigger. |
| Secret Word | `word` | solo | Guess a hidden 5-letter word in 6 tries, with colored tiles as clues. |
| Share or Snatch | `snatch` | showdown | two teams, one pot; both share and split it, one snatches and takes it all. |
| Sleigh Run | `sleighrun` | solo, showdown | A sleigh flies into a cloud; tap where it will come out the other side. |
| Snow Pile | `snowpile` | solo, showdown | Snowflakes flash up for a moment; say how many. The closer, the more points. |
| Snow Sum | `snowsum` | solo, showdown | Snowflakes marked +3, -2 or x2 fall one at a time; keep the running total. |
| Snowball to 21 | `to21` | showdown | teams take turns adding 1, 2 or 3; whoever makes exactly 21 wins. |
| Stack Attack | `stacker` | solo | Tap to drop a sliding row and stack it as high as you can; overhangs get chopped. |
| Staff Angle | `staffangle` | solo, showdown | Turn a wushu staff to an angle like 35 degrees by eye, with no number to read. |
| Stocking Stuffer | `stockings` | showdown | open another stocking for points or bank them; coal loses the round's haul. |
| T-Timer | `timer` | solo | Stop a running clock inside a tiny target window, like 1.20 to 1.25 seconds. |
| Tap Masher | `taps` | solo | Tap as fast as you can for a few seconds; can play a video one frame per tap. |
| Trivia | `trivia` | solo | Multiple-choice questions against the clock; faster right answers score more. |
