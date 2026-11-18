import { colorcountRenderer } from "./games/colorcount";
import { flybyRenderer } from "./games/flyby";
import { snowsumRenderer } from "./games/snowsum";
import { blindstopRenderer, lastsecondRenderer } from "./games/stops";
import type { LiveRenderer } from "./types";

/** Each showdown type's TV view, phone controller and demo (specs 25 to 27). */
export const LIVE_RENDERERS: Readonly<Record<string, LiveRenderer>> = {
  flyby: flybyRenderer,
  snowsum: snowsumRenderer,
  colorcount: colorcountRenderer,
  blindstop: blindstopRenderer,
  lastsecond: lastsecondRenderer,
};
