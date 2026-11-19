import {
  auction,
  blindstop,
  colorcount,
  flyby,
  landmass,
  lastsecond,
  path,
  shuffle,
  snatch,
  snowsum,
  stockings,
  to21,
} from "./games";
import { PERCEPTION_CORES } from "@/lib/games";
import { perceptionShowdown } from "./games/perception";
import type { AnyShowdown } from "./model";

/**
 * Every showdown type the server can run (specs 25 to 27). Each game's
 * module adds itself here; a type missing from this list can't be started.
 */
const SHOWDOWNS: Record<string, AnyShowdown> = {
  flyby,
  snowsum,
  colorcount,
  blindstop,
  lastsecond,
  auction,
  stockings,
  snatch,
  path,
  shuffle,
  to21,
  landmass,
  // Perception games (spec 28): showdown versions; their solo versions are in lib/games.
  ...Object.fromEntries(
    PERCEPTION_CORES.map((core) => [core.type, perceptionShowdown(core as never)]),
  ),
};

export const showdownFor = (type: string): AnyShowdown | undefined => SHOWDOWNS[type];

/** The showdown types that exist, for validating event files. */
export const showdownTypes = (): string[] => Object.keys(SHOWDOWNS);
