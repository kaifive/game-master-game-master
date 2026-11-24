import { buzzerRenderer } from "./games/buzzer";
import { flybyRenderer } from "./games/flyby";
import { auctionRenderer, snatchRenderer, stockingsRenderer } from "./games/nerve";
import { ribbonRenderer, staffangleRenderer } from "./games/perception";
import { snowsumRenderer } from "./games/snowsum";
import { blindstopRenderer, lastsecondRenderer } from "./games/stops";
import { pathRenderer, shuffleRenderer, to21Renderer } from "./games/turns";
import type { LiveRenderer } from "./types";

/** Each showdown type's TV view, phone controller and demo (specs 25 to 27). */
/** What someone in the room calls out in each game's demo, under the drawn TV (Khai, 2026-11-24). */
const SAYS: Readonly<Record<string, string>> = {
  flyby: "5!",
  snowsum: "12!",
  blindstop: "Stop!",
  lastsecond: "Not yet… now!",
  auction: "Bid 7!",
  stockings: "One more!",
  snatch: "Share!",
  path: "Left, then up!",
  shuffle: "That one!",
  to21: "Plus 3!",
  staffangle: "A bit more!",
  ribbon: "Cut here!",
  buzzer: "Buzz!",
};

const SCREENS: Readonly<Record<string, LiveRenderer>> = {
  flyby: flybyRenderer,
  snowsum: snowsumRenderer,
  blindstop: blindstopRenderer,
  lastsecond: lastsecondRenderer,
  auction: auctionRenderer,
  stockings: stockingsRenderer,
  snatch: snatchRenderer,
  path: pathRenderer,
  shuffle: shuffleRenderer,
  to21: to21Renderer,
  staffangle: staffangleRenderer,
  ribbon: ribbonRenderer,
  buzzer: buzzerRenderer,
};

/** Each showdown type's TV view, phone controller, demo and the demo's call-out (specs 24 to 31). */
export const LIVE_RENDERERS: Readonly<Record<string, LiveRenderer>> = Object.fromEntries(
  Object.entries(SCREENS).map(([type, r]) => [type, SAYS[type] ? { ...r, say: SAYS[type] } : r]),
);
